"use server";

export async function callApi(path: string, options: RequestInit = {}) {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(base + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    next: { revalidate: 0 },
  });

  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

export async function getWebinars() {
  return callApi("/api/webinars");
}

export async function getWebinar(id: string) {
  return callApi(`/api/webinars/${id}`);
}

export async function createWebinar(payload: any) {
  return callApi(`/api/webinars`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateWebinar(id: string, payload: any) {
  return callApi(`/api/webinars/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteWebinar(id: string) {
  return callApi(`/api/webinars/${id}`, { method: "DELETE" });
}

export async function getProjects() {
  return callApi(`/api/projects`);
}

export async function createProject(payload: any) {
  return callApi(`/api/projects`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateProject(id: string, payload: any) {
  return callApi(`/api/projects/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteProject(id: string) {
  return callApi(`/api/projects/${id}`, { method: "DELETE" });
}

export async function getPricing() {
  return callApi(`/api/pricing`);
}

export async function createPricing(payload: any) {
  return callApi(`/api/pricing`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updatePricing(id: string, payload: any) {
  return callApi(`/api/pricing/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deletePricing(id: string) {
  return callApi(`/api/pricing/${id}`, { method: "DELETE" });
}

export async function getSubscriptions() {
  return callApi(`/api/subscriptions`);
}

export async function updateSubscription(id: string, payload: any) {
  return callApi(`/api/subscriptions/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function getBlogs() {
  return callApi(`/api/blogs`);
}

export async function getBlog(id: string) {
  return callApi(`/api/blogs/${id}`);
}

export async function createBlog(payload: any) {
  return callApi(`/api/blogs`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateBlog(id: string, payload: any) {
  return callApi(`/api/blogs/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteBlog(id: string) {
  return callApi(`/api/blogs/${id}`, { method: "DELETE" });
}
