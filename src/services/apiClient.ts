export type PersistedState = {
  components: any[];
  dependencies: any[];
  workflows: any[];
};

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function fetchData(): Promise<PersistedState | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/data`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (e) {
    console.warn('API fetchData failed:', e);
    return null;
  }
}

export async function saveData(state: PersistedState): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    return res.ok;
  } catch (e) {
    console.warn('API saveData failed:', e);
    return false;
  }
}
