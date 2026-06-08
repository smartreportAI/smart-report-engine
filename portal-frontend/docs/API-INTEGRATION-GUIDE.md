# Frontend → API Integration Guide

> This document explains how the frontend connects to the Portal API.
> Give this to any frontend developer (or AI) and they can integrate all APIs.

---

## Setup

### Environment Variable
```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### API Client (`src/lib/api/client.ts`)
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle token expiry
  if (response.status === 401 && refreshToken) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      // Retry with new token
      headers['Authorization'] = `Bearer ${accessToken}`;
      const retryResponse = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
      if (!retryResponse.ok) throw await parseError(retryResponse);
      return retryResponse.json();
    }
    // Refresh failed — force logout
    clearTokens();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
}

async function attemptRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    accessToken = data.data.accessToken;
    refreshToken = data.data.refreshToken;
    return true;
  } catch {
    return false;
  }
}

async function parseError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return {
    status: response.status,
    code: body?.error?.code || 'UNKNOWN_ERROR',
    message: body?.error?.message || 'Something went wrong',
  };
}
```

---

## API Function Examples

### Auth
```typescript
// Login
const result = await apiClient('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});
// result.data.accessToken, result.data.refreshToken, result.data.user

// Get current user
const me = await apiClient('/auth/me');
// me.data = { userId, email, name, role, tenantId, ... }
```

### Admin — Dashboard
```typescript
const dashboard = await apiClient('/admin/dashboard');
// dashboard.data.clients = { total, live, inactive, lowCredits, expiringSoon }
// dashboard.data.reports = { total, today, thisWeek, thisMonth, failuresToday }
// dashboard.data.recentFailures = [...]
```

### Admin — Clients
```typescript
// List
const clients = await apiClient('/admin/clients?page=1&limit=20&search=raj');
// clients.data = [...], clients.meta = { page, limit, total, totalPages }

// Detail
const detail = await apiClient('/admin/clients/rajagiri');
// detail.data.client = {...}, detail.data.recentReports = [...], detail.data.stats = {...}

// Onboard
await apiClient('/admin/clients', {
  method: 'POST',
  body: JSON.stringify({
    tenantId: 'new-lab',
    labName: 'New Lab',
    subscriptionStartDate: '2026-07-01',
    subscriptionEndDate: '2026-10-01',
    initialCredits: 1000,
    // ... other fields
  }),
});

// Add Credits
await apiClient('/admin/clients/rajagiri/credits', {
  method: 'POST',
  body: JSON.stringify({ credits: 500, amount: 2500, method: 'upi', reference: 'TXN123' }),
});

// Toggle
await apiClient('/admin/clients/rajagiri/toggle', { method: 'POST' });

// Update
await apiClient('/admin/clients/rajagiri', {
  method: 'PATCH',
  body: JSON.stringify({ subscriptionEndDate: '2026-12-01' }),
});
```

### Admin — Reports
```typescript
// List with filters
const reports = await apiClient(
  '/admin/reports?tenantId=rajagiri&from=2026-06-01&to=2026-06-30&status=completed&page=1'
);

// Detail
const report = await apiClient('/admin/reports/6a2553d2b5be689f9f8272e4');

// Failures only
const failures = await apiClient('/admin/reports/failures?page=1');

// Unmapped
const unmapped = await apiClient('/admin/reports/unmapped');

// Stats (charts data)
const stats = await apiClient('/admin/reports/stats?days=30');
// stats.data.perDay = [{ _id: '2026-06-01', count: 15, failures: 0 }, ...]
// stats.data.perTenant = [{ _id: 'rajagiri', count: 450 }, ...]
```

### Admin — Users
```typescript
// List
const users = await apiClient('/admin/users?page=1&role=client');

// Register new user
await apiClient('/auth/register', {
  method: 'POST',
  body: JSON.stringify({ email: 'lab@newclient.com', password: 'Pass@1234', name: 'Lab Admin', role: 'client', tenantId: 'new-client' }),
});

// Disable user
await apiClient('/admin/users/USER_ID', {
  method: 'PATCH',
  body: JSON.stringify({ isActive: false }),
});
```

### Admin — Audit Log
```typescript
const logs = await apiClient('/admin/audit-log?page=1&action=client.addCredits&tenantId=rajagiri');
```

### Client — Dashboard
```typescript
const dashboard = await apiClient('/client/dashboard');
// dashboard.data = { labName, plan, status, subscription: {...}, credits: {...}, reports: {...}, recentReports: [...] }
```

### Client — Reports
```typescript
// List (auto-scoped to their tenantId)
const reports = await apiClient('/client/reports?page=1&from=2026-06-01');

// Detail
const report = await apiClient('/client/reports/RHH123');

// Stats
const stats = await apiClient('/client/reports/stats?days=30');
```

### Client — Credits
```typescript
const credits = await apiClient('/client/credits');
// credits.data = { totalCredits, usedCredits, remainingCredits, payments: [...] }
```

### Client — Profile
```typescript
// Get
const profile = await apiClient('/client/profile');

// Update
await apiClient('/client/profile', {
  method: 'PATCH',
  body: JSON.stringify({ contactEmail: 'new@email.com' }),
});
```

---

## TanStack Query Integration

```typescript
// src/lib/api/hooks/useAdminDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiClient('/admin/dashboard'),
    refetchInterval: 30000, // refresh every 30 seconds
  });
}

// Usage in component:
function DashboardPage() {
  const { data, isLoading, error } = useAdminDashboard();
  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorState error={error} />;
  return <Dashboard data={data.data} />;
}
```

---

## Switching from Local to Production

| Step | What to change | Where |
|------|---------------|-------|
| 1 | Deploy Portal API to AWS Lambda/EC2 | Get production URL |
| 2 | Set `NEXT_PUBLIC_API_URL=https://api.yourdomain.com` | Vercel environment settings |
| 3 | Deploy frontend to Vercel | `vercel deploy` |
| 4 | Done | Zero code changes |

The frontend code NEVER has `localhost:3001` hardcoded anywhere — it always reads from the environment variable.
