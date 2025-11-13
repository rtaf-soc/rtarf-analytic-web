# app/scheduler.py
"""
Background scheduler for syncing Elasticsearch to PostgreSQL
"""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
from elasticsearch import AsyncElasticsearch
from .database import SessionLocal
from .cruds import rtarf_events as cruds

logger = logging.getLogger(__name__)

class SyncScheduler:
    def __init__(self, es_client: AsyncElasticsearch):
        self.scheduler = AsyncIOScheduler()
        self.es_client = es_client
        self.last_sync_result = None
        
    async def sync_job(self):
        """
        Background job that syncs ES to PostgreSQL
        Runs automatically based on the configured interval
        """
        db = SessionLocal()
        try:
            logger.info(f"⏰ Starting scheduled ES → PostgreSQL sync at {datetime.now()}")
            
            result = await cruds.insert_rtarf_event_into_postgres(db, self.es_client)
            
            self.last_sync_result = {
                **result,
                "timestamp": datetime.now().isoformat()
            }
            
            # Log with appropriate emoji based on status
            if result.get("status") == "success":
                logger.info(
                    f"✅ Sync completed successfully: "
                    f"{result.get('total_processed', 0)} events processed "
                    f"({result.get('inserted', 0)} inserted, {result.get('updated', 0)} updated)"
                )
            else:
                logger.warning(f"⚠️ Sync completed with warnings: {result}")
                
        except Exception as e:
            logger.error(f"❌ Sync job failed: {e}", exc_info=True)
            self.last_sync_result = {
                "status": "error",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }
        finally:
            db.close()
    
    def start(self, interval_minutes: int = 5):
        """
        Start the background scheduler
        
        Args:
            interval_minutes: How often to run sync (in minutes)
        """
        # Remove existing job if any
        if self.scheduler.get_job('es_postgres_sync'):
            self.scheduler.remove_job('es_postgres_sync')
        
        # Add new job
        self.scheduler.add_job(
            self.sync_job,
            trigger=IntervalTrigger(minutes=interval_minutes),
            id='es_postgres_sync',
            name='Sync Elasticsearch to PostgreSQL',
            replace_existing=True,
            max_instances=1,  # Prevent overlapping runs
            misfire_grace_time=60  # Allow 60s delay if server is busy
        )
        
        self.scheduler.start()
        logger.info(f"🚀 Scheduler started - syncing every {interval_minutes} minute(s)")
    
    def stop(self):
        """Stop the scheduler gracefully"""
        if self.scheduler.running:
            self.scheduler.shutdown(wait=True)
            logger.info("🛑 Scheduler stopped")
    
    def get_status(self):
        """Get current scheduler status"""
        jobs = self.scheduler.get_jobs()
        
        return {
            "running": self.scheduler.running,
            "jobs": len(jobs),
            "last_sync": self.last_sync_result,
            "next_run": jobs[0].next_run_time.isoformat() if jobs and jobs[0].next_run_time else None
        }

# ===============================================================
# Global Scheduler Instance
# ===============================================================

_sync_scheduler = None

def get_scheduler() -> SyncScheduler:
    """Get the global scheduler instance"""
    return _sync_scheduler

def init_scheduler(es_client: AsyncElasticsearch, interval_minutes: int = 5) -> SyncScheduler:
    """
    Initialize and start the global scheduler
    
    Args:
        es_client: AsyncElasticsearch client instance
        interval_minutes: Sync interval in minutes (default: 5)
    
    Returns:
        SyncScheduler instance
    """
    global _sync_scheduler
    
    if _sync_scheduler is not None:
        logger.warning("Scheduler already initialized, returning existing instance")
        return _sync_scheduler
    
    _sync_scheduler = SyncScheduler(es_client)
    _sync_scheduler.start(interval_minutes)
    
    return _sync_scheduler