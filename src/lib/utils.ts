// lib/utils.ts

export function mapMongoDoc<T extends { _id?: any }>(doc: T | null) {
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return { ...rest, id: _id ? String(_id) : undefined } as any;
}

export function mapMongoDocs<T extends { _id?: any }>(docs: T[]) {
  return docs.map((d) => mapMongoDoc(d) as T);
}
