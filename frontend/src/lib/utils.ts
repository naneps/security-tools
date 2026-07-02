import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { CollectionItem, Endpoint } from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Recursively flatten a Postman-like items tree into a flat list of request endpoints */
export function flattenItems(items: CollectionItem[] | undefined): Endpoint[] {
  if (!items || items.length === 0) return []
  const result: Endpoint[] = []
  const walk = (nodes: CollectionItem[]) => {
    for (const node of nodes) {
      if (node.type === 'request') {
        // Strip the extra 'type' for compatibility with old Endpoint usage
        const { type, ...ep } = node as any
        result.push(ep as Endpoint)
      } else if (node.type === 'folder' && node.items) {
        walk(node.items)
      }
    }
  }
  walk(items)
  return result
}

/** Get only the top level requests + folders (for tree rendering) */
export function getItemsTree(items: CollectionItem[] | undefined): CollectionItem[] {
  return items || []
}

/** Collect all request endpoints under a specific folder (recursive) */
export function collectRequestsUnderFolder(items: CollectionItem[], folderId: string): Endpoint[] {
  const findFolder = (nodes: CollectionItem[]): CollectionItem | undefined => {
    for (const n of nodes) {
      if (n.type === 'folder' && n.id === folderId) return n
      if (n.type === 'folder' && n.items) {
        const f = findFolder(n.items)
        if (f) return f
      }
    }
    return undefined
  }
  const folder = findFolder(items)
  if (!folder || !folder.items) return []
  return flattenItems(folder.items)
}
