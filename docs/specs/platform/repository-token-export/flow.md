# Flow

1. A module defines the repository contract.
2. The owning module exports the token or provider contract.
3. Consuming modules import the contract, not a local duplicate.
4. Infrastructure implementations stay behind the contract boundary.
