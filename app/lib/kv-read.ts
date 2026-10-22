// Bulk-read overload added after the project's pinned Workers type package.
declare global {
  interface KVNamespace<Key extends string = string> {
    get(keys:Key[],type:'text'):Promise<Map<Key,string|null>>
  }
}
// Bulk reads are supported by Workers KV; the fallback keeps older local
// Miniflare versions usable without changing production configuration.
export async function readKvValues(namespace:KVNamespace,keys:string[]):Promise<(string|null)[]> {
  if (!keys.length) return []
  // Workers KV accepts at most 100 keys per bulk read.
  if (keys.length > 100) {
    const groups: Promise<(string|null)[]>[] = []
    for (let offset = 0; offset < keys.length; offset += 100) {
      groups.push(readKvValues(namespace, keys.slice(offset, offset + 100)))
    }
    return (await Promise.all(groups)).flat()
  }
  try {
    const values = await namespace.get(keys,'text')
    if(values instanceof Map)return keys.map(key=>values.get(key)??null)
  } catch(error) {
    if(!(error instanceof TypeError))throw error
  }
  return Promise.all(keys.map(key=>namespace.get(key)))
}
