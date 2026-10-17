import type { DocumentReference, Firestore, Query } from "firebase-admin/firestore";

type Constraint =
  | { kind: "where"; field: string; operator: FirebaseFirestore.WhereFilterOp; value: unknown }
  | { kind: "limit"; count: number };

export function collection(db: Firestore, path: string) {
  return db.collection(path);
}

export function doc(parent: any, ...paths: string[]) {
  const path = paths.join("/");
  if (typeof parent?.doc === "function") return parent.doc(path) as DocumentReference;
  if (typeof parent?.collection === "function") return parent.doc(path) as DocumentReference;
  throw new Error("FIRESTORE_REFERENCE_INVALID");
}

export function where(field: string, operator: FirebaseFirestore.WhereFilterOp, value: unknown): Constraint {
  return { kind: "where", field, operator, value };
}

export function limit(count: number): Constraint {
  return { kind: "limit", count };
}

export function query<T>(reference: Query<T> | FirebaseFirestore.CollectionReference<T>, ...constraints: Constraint[]): Query<T> {
  return constraints.reduce((current, constraint) => {
    if (constraint.kind === "where") return current.where(constraint.field, constraint.operator, constraint.value);
    return current.limit(constraint.count);
  }, reference as Query<T>);
}

export function getDocs(reference: Query | FirebaseFirestore.CollectionReference) {
  return reference.get();
}

export function getDoc(reference: FirebaseFirestore.DocumentReference) {
  return reference.get().then((snapshot) => ({
    exists: () => snapshot.exists,
    data: () => snapshot.data(),
    id: snapshot.id,
    ref: snapshot.ref,
  }));
}

export function setDoc(reference: FirebaseFirestore.DocumentReference, data: unknown, options?: FirebaseFirestore.SetOptions) {
  return options ? reference.set(data as any, options) : reference.set(data as any);
}

export function writeBatch(db: Firestore) {
  return db.batch();
}

export function runTransaction<T>(db: Firestore, updateFunction: (transaction: any) => Promise<T>) {
  return db.runTransaction(async (transaction) => updateFunction({
    get: async (reference: DocumentReference) => {
      const snapshot = await transaction.get(reference);
      return {
        exists: () => snapshot.exists,
        data: () => snapshot.data(),
        id: snapshot.id,
        ref: snapshot.ref,
      };
    },
    set: (reference: DocumentReference, data: unknown, options?: FirebaseFirestore.SetOptions) =>
      options ? transaction.set(reference, data as any, options) : transaction.set(reference, data as any),
    update: (reference: DocumentReference, data: unknown) => transaction.update(reference, data as any),
    delete: (reference: DocumentReference) => transaction.delete(reference),
    create: (reference: DocumentReference, data: unknown) => transaction.create(reference, data as any),
  }));
}

export function getCountFromServer(reference: Query) {
  return reference.count().get();
}
