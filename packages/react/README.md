# paykit-react

PayKit React SDK — `PayKitProvider`, `usePayKit()`, `<Paywall>`. Credits & usage billing for AI apps.

## Install
```bash
npm install paykit-react
```
Requires `react >= 18`. Deploy alongside a PayKit backend (this package talks to `/api/v1/*`).

## Usage
```tsx
import { PayKitProvider, usePayKit, Paywall } from "paykit-react"

function App() {
  return (
    <PayKitProvider userId={user.id}>
      <GenerateButton />
      <Paywall plan="pro" fallback={<UpgradeCard />}>
        <ProFeature />
      </Paywall>
    </PayKitProvider>
  )
}

function GenerateButton() {
  const { meter, account } = usePayKit()
  return (
    <button onClick={() => meter("image_gen")} disabled={!account}>
      Generate ({account?.credits} credits)
    </button>
  )
}
```

## API
- `usePayKit()` → `{ account, loading, refresh, meter, buyCredits, upgrade, checkout, portal, hasAccess }`
- `<Paywall plan="pro" fallback={...}>` — renders children only if the account has access.
- `meter(event, cost?)` → `{ ok, blocked, remaining }`

Docs: https://github.com/guillaume-flambard/paykit
