import { requireAdmin, jsonResponse } from '../../_lib/auth.js';
import { getKeys, saveKeys, maskKey } from '../../_lib/store.js';

// GET: عرض كل المفاتيح (بشكل مُموّه، من غير القيمة الكاملة للمفتاح)
export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return jsonResponse({ error: 'Unauthorized' }, 401);

  const keys = await getKeys(env);
  const masked = keys.map((k) => ({
    id: k.id,
    name: k.name,
    baseUrl: k.baseUrl,
    model: k.model,
    enabled: k.enabled !== false,
    apiKeyMasked: maskKey(k.apiKey)
  }));

  return jsonResponse({ keys: masked });
}

// POST: إضافة مفتاح جديد
export async function onRequestPost({ request, env }) {
  if (!(await requireAdmin(request, env))) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { name, baseUrl, apiKey, model, enabled } = body || {};

  if (!name || !baseUrl || !apiKey) {
    return jsonResponse(
      { error: 'Invalid request', message: 'الاسم، رابط الـ API، والمفتاح كلها حقول مطلوبة.' },
      400
    );
  }

  const keys = await getKeys(env);
  const newKey = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    baseUrl: String(baseUrl).trim(),
    apiKey: String(apiKey).trim(),
    model: model ? String(model).trim() : 'claude-opus-5-thinking',
    enabled: enabled !== false
  };

  keys.push(newKey);
  await saveKeys(env, keys);

  return jsonResponse({ success: true, id: newKey.id });
}

// PATCH: تفعيل/تعطيل مفتاح موجود
export async function onRequestPatch({ request, env }) {
  if (!(await requireAdmin(request, env))) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { id, enabled } = body || {};
  if (!id) return jsonResponse({ error: 'Missing id' }, 400);

  const keys = await getKeys(env);
  const key = keys.find((k) => k.id === id);
  if (!key) return jsonResponse({ error: 'Not found' }, 404);

  key.enabled = !!enabled;
  await saveKeys(env, keys);

  return jsonResponse({ success: true });
}

// DELETE: حذف مفتاح (?id=...)
export async function onRequestDelete({ request, env }) {
  if (!(await requireAdmin(request, env))) return jsonResponse({ error: 'Unauthorized' }, 401);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return jsonResponse({ error: 'Missing id' }, 400);

  let keys = await getKeys(env);
  const before = keys.length;
  keys = keys.filter((k) => k.id !== id);

  if (keys.length === before) return jsonResponse({ error: 'Not found' }, 404);

  await saveKeys(env, keys);
  return jsonResponse({ success: true });
}
