# demo-backend

Contract-first backend demo.

## Run

```text
node server.js
```

Server starts on `http://localhost:3001`.

## Implemented endpoints

- `POST /api/payments/intent`
- `GET /api/payments/{id}/status`

## Contract source

The backend reads the shared contract from the `ai-contracts` submodule:

- `ai-contracts/contracts/api/payments.md`

## Suggested prompt

```text
Read ai-contracts/contracts/api/payments.md.
Implement the backend endpoint exactly according to this contract.
Do not change the response shape unless you update the contract first.
```
