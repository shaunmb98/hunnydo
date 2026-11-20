// Remove throwaway accounts created while testing (anything @example.com) and everything they own.
// Usage: node --env-file=.env.local scripts/cleanup-test-data.mjs [--dry]
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const dry = process.argv.includes("--dry");
initializeApp({ credential: applicationDefault(), projectId: "hunnydo-app" });
const auth = getAuth();
const db = getFirestore();
const bucket = getStorage().bucket("hunnydo-app.firebasestorage.app");

const testUsers = [];
let page;
do {
  page = await auth.listUsers(1000, page?.pageToken);
  testUsers.push(...page.users.filter((u) => (u.email ?? "").endsWith("@example.com")));
} while (page.pageToken);
const uids = new Set(testUsers.map((u) => u.uid));
console.log(`${testUsers.length} test accounts`);

let businesses = 0;
let openJobs = 0;
for (const doc of (await db.collection("businesses").get()).docs) {
  if (!uids.has(doc.data().ownerUid)) continue;
  businesses++;
  if (!dry) await db.recursiveDelete(doc.ref);
}
for (const doc of (await db.collection("openJobs").get()).docs) {
  if (!uids.has(doc.data().ownerUid)) continue;
  openJobs++;
  if (!dry) {
    await doc.ref.delete();
    await bucket.deleteFiles({ prefix: `board/${doc.id}/` }).catch(() => {});
  }
}
for (const uid of uids) {
  if (dry) continue;
  await db.recursiveDelete(db.collection("users").doc(uid));
  await bucket.deleteFiles({ prefix: `users/${uid}/` }).catch(() => {});
}
if (!dry && testUsers.length) await auth.deleteUsers(testUsers.map((u) => u.uid));
console.log(`${dry ? "would remove" : "removed"}: ${testUsers.length} accounts, ${businesses} claimed businesses, ${openJobs} board posts`);
