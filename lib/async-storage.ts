"use client";

import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getItem(key: string): Promise<string | null> {
  return await AsyncStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function clear(): Promise<void> {
  await AsyncStorage.clear();
}

export async function getAllKeys(): Promise<readonly string[]> {
  return await AsyncStorage.getAllKeys();
}

export async function multiGet(keys: string[]): Promise<[string, string | null][]> {
  const result = await AsyncStorage.multiGet(keys);
  return result as [string, string | null][];
}

export async function multiSet(keyValuePairs: [string, string][]): Promise<void> {
  await AsyncStorage.multiSet(keyValuePairs as readonly [string, string][]);
}

export async function multiRemove(keys: readonly string[]): Promise<void> {
  await AsyncStorage.multiRemove(keys);
}
