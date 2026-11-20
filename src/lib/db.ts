"use client";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type Query,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";
import type { Bid, Job, Pro } from "./types";

// Client-side Firestore paths. Security rules restrict each user to their own subtree.
export const userRef = (uid: string) => doc(db, "users", uid);
export const prosRef = (uid: string) => collection(db, "users", uid, "pros");
export const proRef = (uid: string, proId: string) => doc(db, "users", uid, "pros", proId);
export const jobsRef = (uid: string) => collection(db, "users", uid, "jobs");
export const jobRef = (uid: string, jobId: string) => doc(db, "users", uid, "jobs", jobId);
export const bidsRef = (uid: string, jobId: string) => collection(db, "users", uid, "jobs", jobId, "bids");
export const bidRef = (uid: string, jobId: string, proId: string) =>
  doc(db, "users", uid, "jobs", jobId, "bids", proId);

/** Firestore rejects undefined; strip it before writes. */
export function clean<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function useLiveQuery<T>(q: Query<DocumentData> | null, key: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!q) return;
    setLoading(true);
    return onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })));
        setLoading(false);
      },
      (err) => {
        console.error("[db]", key, err);
        setLoading(false);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data, loading };
}

function useLiveDoc<T>(path: string[] | null) {
  const key = path?.join("/") ?? "";
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!path) return;
    setLoading(true);
    return onSnapshot(
      doc(db, path[0], ...path.slice(1)),
      (snap) => {
        setData(snap.exists() ? ({ ...(snap.data() as T), id: snap.id } as T) : null);
        setLoading(false);
      },
      (err) => {
        console.error("[db]", key, err);
        setLoading(false);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data, loading };
}

/** All pros for this user (nearby + manual). Filter/sort in the component. */
export const usePros = (uid?: string) =>
  useLiveQuery<Pro>(uid ? query(prosRef(uid)) : null, `pros:${uid}`);

export const usePro = (uid?: string, proId?: string) =>
  useLiveDoc<Pro>(uid && proId ? ["users", uid, "pros", proId] : null);

export const useJobs = (uid?: string) =>
  useLiveQuery<Job>(uid ? query(jobsRef(uid), orderBy("createdAt", "desc")) : null, `jobs:${uid}`);

export const useJob = (uid?: string, jobId?: string) =>
  useLiveDoc<Job>(uid && jobId ? ["users", uid, "jobs", jobId] : null);

export const useBids = (uid?: string, jobId?: string) =>
  useLiveQuery<Bid>(uid && jobId ? query(bidsRef(uid, jobId)) : null, `bids:${uid}:${jobId}`);
