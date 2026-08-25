This layer owns Backtesting persistence and the BullMQ/Redis queue adapter.
PostgreSQL remains authoritative for dispatch, attempt, fence, and result state;
Redis only delivers the bounded worker job.
