# RTARF Event Sync Scheduler

Automatic scheduler for syncing RTARF events from Elasticsearch to PostgreSQL.

## Features

✅ **Automatic Sync** - Runs at configurable intervals  
✅ **Manual Trigger** - API endpoint to force immediate sync  
✅ **Status Monitoring** - Track sync statistics and health  
✅ **Error Handling** - Robust error recovery and logging  
✅ **Graceful Shutdown** - Clean startup/shutdown lifecycle  

## Configuration

### Environment Variables

```bash
# Enable/disable scheduler
RTARF_SYNC_ENABLED=true

# Sync interval in seconds (default: 300 = 5 minutes)
RTARF_SYNC_INTERVAL_SECONDS=300
```

### Recommended Intervals

| Interval | Seconds | Use Case |
|----------|---------|----------|
| 1 minute | 60 | High-frequency updates (development) |
| 5 minutes | 300 | **Recommended** (production) |
| 10 minutes | 600 | Low-frequency updates |
| 30 minutes | 1800 | Very low frequency |
| 1 hour | 3600 | Minimal updates |

## API Endpoints

### Get Scheduler Status
```http
GET /scheduler/status
```

**Response:**
```json
{
  "is_running": true,
  "interval_seconds": 300,
  "last_sync_time": "2025-11-14T10:30:00",
  "last_sync_status": "success",
  "total_syncs": 42,
  "failed_syncs": 2,
  "success_rate": "95.2%"
}
```

### Trigger Manual Sync
```http
POST /scheduler/sync-now
```

**Response:**
```json
{
  "message": "Manual sync completed",
  "result": {
    "status": "success",
    "total_processed": 150,
    "inserted": 10,
    "updated": 140
  },
  "scheduler_status": { ... }
}
```

### Start Scheduler
```http
POST /scheduler/start
```

### Stop Scheduler
```http
POST /scheduler/stop
```

## Usage Examples

### Using cURL

```bash
# Check scheduler status
curl http://localhost:8000/scheduler/status

# Trigger manual sync
curl -X POST http://localhost:8000/scheduler/sync-now

# Stop scheduler
curl -X POST http://localhost:8000/scheduler/stop

# Start scheduler
curl -X POST http://localhost:8000/scheduler/start
```

### Using Python

```python
import requests

# Get status
response = requests.get("http://localhost:8000/scheduler/status")
print(response.json())

# Manual sync
response = requests.post("http://localhost:8000/scheduler/sync-now")
print(response.json())
```

### Using JavaScript/Fetch

```javascript
// Get status
const status = await fetch('http://localhost:8000/scheduler/status')
  .then(res => res.json());
console.log(status);

// Manual sync
const syncResult = await fetch('http://localhost:8000/scheduler/sync-now', {
  method: 'POST'
}).then(res => res.json());
console.log(syncResult);
```

## Monitoring

### Logs

The scheduler produces detailed logs:

```
2025-11-14 10:25:00 | app.scheduler | INFO | 🚀 RTARF Event Scheduler started (interval: 300s)
2025-11-14 10:25:00 | app.scheduler | INFO | 🔄 Starting RTARF event sync from Elasticsearch...
2025-11-14 10:25:05 | app.scheduler | INFO | ✅ Sync completed successfully: 150 events processed, 10 inserted, 140 updated
2025-11-14 10:30:00 | app.scheduler | INFO | 🔄 Starting RTARF event sync from Elasticsearch...
```

### Status Monitoring

Monitor scheduler health by regularly checking the status endpoint:

```bash
# Create a simple monitoring script
watch -n 30 'curl -s http://localhost:8000/scheduler/status | jq'
```

## Troubleshooting

### Scheduler Not Running

**Check status:**
```bash
curl http://localhost:8000/scheduler/status
```

**Start manually:**
```bash
curl -X POST http://localhost:8000/scheduler/start
```

### Sync Failures

Check logs for errors:
```bash
# If using journalctl
journalctl -u your-app-service -f

# If using docker logs
docker logs -f your-container-name
```

### High Failure Rate

1. Check Elasticsearch connectivity
2. Verify database connection
3. Review error logs
4. Consider increasing sync interval

## Architecture

```
┌──────────────────┐
│   FastAPI App    │
│                  │
│  ┌────────────┐  │
│  │ Scheduler  │  │  ← Runs every N seconds
│  └─────┬──────┘  │
│        │         │
│        ▼         │
│  ┌────────────┐  │
│  │   CRUD     │  │  ← insert_rtarf_event_into_postgres()
│  └─────┬──────┘  │
└────────┼─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌──────────┐
│  ES    │  │ PostgreSQL│
└────────┘  └──────────┘
```

## Lifecycle

1. **Startup** → Scheduler starts automatically
2. **Running** → Syncs at configured interval
3. **Shutdown** → Scheduler stops gracefully

## Best Practices

1. **Monitor Success Rate** - Alert if below 90%
2. **Adjust Interval** - Based on data volume
3. **Use Manual Sync** - For immediate updates
4. **Check Logs** - Regularly review for errors
5. **Test Configuration** - Verify sync before production

## Development

### Running Locally

```bash
# Set environment variables
export RTARF_SYNC_INTERVAL_SECONDS=60
export RTARF_SYNC_ENABLED=true

# Run the application
uvicorn app.main:app --reload
```

### Testing the Scheduler

```python
# Test in Python console
import asyncio
from app.scheduler import RtarfEventScheduler

async def test():
    scheduler = RtarfEventScheduler(interval_seconds=10)
    await scheduler.start()
    await asyncio.sleep(30)  # Run for 30 seconds
    await scheduler.stop()
    print(scheduler.get_status())

asyncio.run(test())
```

## Performance Considerations

- **Memory**: Minimal overhead (~1-2 MB)
- **CPU**: Negligible during idle, spikes during sync
- **Network**: Depends on Elasticsearch query size
- **Database**: Uses bulk upsert for efficiency

## Future Enhancements

- [ ] Webhook notifications on sync completion
- [ ] Metrics export (Prometheus)
- [ ] Configurable retry logic
- [ ] Multiple sync strategies
- [ ] Real-time sync triggers