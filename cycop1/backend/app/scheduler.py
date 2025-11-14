# app/scheduler.py
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from . import crud, database, elastic_client, models

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: Optional[AsyncIOScheduler] = None

# ===============================================================
# Sync Metadata Model (if not already exists)
# ===============================================================

class SyncMetadata(models.Base):
    """Track sync operations"""
    __tablename__ = "sync_metadata"
    
    from sqlalchemy import Column, Integer, String, DateTime
    
    id = Column(Integer, primary_key=True, index=True)
    sync_type = Column(String, nullable=False, unique=True)  # 'elasticsearch_sync'
    last_sync_timestamp = Column(DateTime, nullable=True)
    last_sync_completed = Column(DateTime, nullable=True)
    last_sync_status = Column(String, nullable=True)  # 'success', 'error'
    total_processed = Column(Integer, default=0)
    last_error_message = Column(String, nullable=True)

# ===============================================================
# Helper Functions
# ===============================================================

def get_last_sync_time(db: Session, sync_type: str = "elasticsearch_sync") -> Optional[datetime]:
    """Get the last successful sync timestamp"""
    try:
        metadata = db.query(SyncMetadata).filter(
            SyncMetadata.sync_type == sync_type
        ).first()
        
        if metadata and metadata.last_sync_status == "success":
            return metadata.last_sync_timestamp
        return None
    except Exception as e:
        logger.error(f"Error getting last sync time: {e}")
        return None

def update_sync_metadata(
    db: Session,
    sync_type: str,
    status: str,
    total_processed: int = 0,
    latest_timestamp: Optional[datetime] = None,
    error_message: Optional[str] = None
):
    """Update sync metadata after sync operation"""
    try:
        metadata = db.query(SyncMetadata).filter(
            SyncMetadata.sync_type == sync_type
        ).first()
        
        if not metadata:
            metadata = SyncMetadata(sync_type=sync_type)
            db.add(metadata)
        
        metadata.last_sync_completed = datetime.utcnow()
        metadata.last_sync_status = status
        metadata.total_processed = total_processed
        
        if status == "success" and latest_timestamp:
            metadata.last_sync_timestamp = latest_timestamp
            metadata.last_error_message = None
        elif status == "error" and error_message:
            metadata.last_error_message = error_message
        
        db.commit()
        logger.info(f"✅ Sync metadata updated: {sync_type} - {status}")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Failed to update sync metadata: {e}")

# ===============================================================
# Scheduled Task Functions
# ===============================================================

async def sync_elasticsearch_to_postgres():
    """
    Scheduled task to sync data from Elasticsearch to PostgreSQL
    Only syncs new records since last sync
    """
    logger.info("🔄 Starting scheduled Elasticsearch sync...")
    
    db = database.SessionLocal()
    try:
        # Get last sync time
        last_sync_time = get_last_sync_time(db)
        
        if last_sync_time:
            logger.info(f"📅 Syncing events after: {last_sync_time}")
        else:
            logger.info("📅 First sync - fetching all events")
        
        # Perform sync with time filter
        result = await crud.insert_rtarf_event_into_postgres(
            db=db,
            es_client=elastic_client.es,
            last_sync_time=last_sync_time
        )
        
        if result.get("status") == "success":
            total = result.get("total_processed", 0)
            latest_ts = result.get("latest_timestamp")
            
            logger.info(
                f"✅ Sync completed successfully - "
                f"Processed: {total} events"
            )
            
            # Update metadata
            update_sync_metadata(
                db=db,
                sync_type="elasticsearch_sync",
                status="success",
                total_processed=total,
                latest_timestamp=datetime.fromisoformat(latest_ts) if latest_ts else None
            )
        else:
            error_msg = result.get("message", "Unknown error")
            logger.error(f"❌ Sync failed: {error_msg}")
            
            update_sync_metadata(
                db=db,
                sync_type="elasticsearch_sync",
                status="error",
                error_message=error_msg
            )
            
    except Exception as e:
        logger.error(f"❌ Sync task error: {e}", exc_info=True)
        
        update_sync_metadata(
            db=db,
            sync_type="elasticsearch_sync",
            status="error",
            error_message=str(e)
        )
    finally:
        db.close()

async def cleanup_old_events():
    """
    Optional: Clean up old events from database
    Configurable retention period
    """
    logger.info("🧹 Starting cleanup of old events...")
    
    db = database.SessionLocal()
    try:
        # Keep events for last 90 days (configurable)
        retention_days = 90
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        deleted_count = db.query(models.RtarfEvent).filter(
            models.RtarfEvent.timestamp < cutoff_date
        ).delete()
        
        db.commit()
        logger.info(f"✅ Cleaned up {deleted_count} old events (older than {retention_days} days)")
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Cleanup error: {e}", exc_info=True)
    finally:
        db.close()

async def sync_alerts_from_events():
    """
    Scheduled task to sync RtarfEvents to Alerts table
    Only syncs new events since last sync
    """
    logger.info("🚨 Starting scheduled alert sync...")
    
    db = database.SessionLocal()
    try:
        # Get last sync time for alerts
        last_sync_time = get_last_sync_time(db, sync_type="alert_sync")
        
        if last_sync_time:
            logger.info(f"📅 Syncing alerts after: {last_sync_time}")
        else:
            logger.info("📅 First alert sync - processing all events")
        
        # Perform sync
        result = await crud.sync_new_rtarf_events_to_alerts(
            db=db,
            last_sync_time=last_sync_time
        )
        
        if result.get("status") == "success":
            total = result.get("total_processed", 0)
            latest_ts = result.get("latest_timestamp")
            
            logger.info(
                f"✅ Alert sync completed - "
                f"Created: {total} alerts"
            )
            
            # Update metadata
            update_sync_metadata(
                db=db,
                sync_type="alert_sync",
                status="success",
                total_processed=total,
                latest_timestamp=datetime.fromisoformat(latest_ts) if latest_ts else None
            )
        else:
            error_msg = result.get("message", "Unknown error")
            logger.error(f"❌ Alert sync failed: {error_msg}")
            
            update_sync_metadata(
                db=db,
                sync_type="alert_sync",
                status="error",
                error_message=error_msg
            )
            
    except Exception as e:
        logger.error(f"❌ Alert sync error: {e}", exc_info=True)
        
        update_sync_metadata(
            db=db,
            sync_type="alert_sync",
            status="error",
            error_message=str(e)
        )
    finally:
        db.close()

async def generate_daily_report():
    """
    Optional: Generate daily security report
    """
    logger.info("📊 Generating daily security report...")
    
    db = database.SessionLocal()
    try:
        # Get statistics
        event_stats = crud.get_severity_statistics(db)
        alert_stats = crud.get_alert_statistics(db)
        trend = crud.get_severity_trend(db, hours=24)
        
        logger.info(
            f"📈 Daily Report:\n"
            f"  Total Events: {event_stats.get('total_events', 0)}\n"
            f"  Total Alerts: {alert_stats.get('total_alerts', 0)}\n"
            f"  Recent (24h): {alert_stats.get('recent_24h', 0)}\n"
            f"  Critical Events: {event_stats.get('severity_distribution', {}).get('critical', 0)}\n"
            f"  Trend: {trend.get('trend', 'unknown')}"
        )
        
        # Here you could:
        # - Send email alerts
        # - Write to log file
        # - Send to monitoring system
        # - Update dashboard metrics
        
    except Exception as e:
        logger.error(f"❌ Report generation error: {e}", exc_info=True)
    finally:
        db.close()

# ===============================================================
# Scheduler Configuration
# ===============================================================

def start_scheduler():
    """
    Initialize and start the background scheduler
    """
    global scheduler
    
    if scheduler is not None:
        logger.warning("⚠️ Scheduler already running")
        return
    
    scheduler = AsyncIOScheduler(timezone="UTC")
    
    # ===== Job 1: Sync Elasticsearch every 5 minutes =====
    scheduler.add_job(
        sync_elasticsearch_to_postgres,
        trigger=IntervalTrigger(minutes=5),
        id="elasticsearch_sync",
        name="Sync Elasticsearch to PostgreSQL",
        replace_existing=True,
        max_instances=1  # Prevent overlapping runs
    )
    logger.info("📅 Scheduled: Elasticsearch sync every 5 minutes")
    
    # ===== Job 2: Cleanup old events daily at 2 AM =====
    scheduler.add_job(
        cleanup_old_events,
        trigger=CronTrigger(hour=2, minute=0),
        id="cleanup_old_events",
        name="Cleanup old events",
        replace_existing=True
    )
    logger.info("📅 Scheduled: Cleanup old events daily at 2:00 AM")
    
    # ===== Job 3: Daily report at 8 AM =====
    scheduler.add_job(
        generate_daily_report,
        trigger=CronTrigger(hour=8, minute=0),
        id="daily_report",
        name="Generate daily report",
        replace_existing=True
    )
    logger.info("📅 Scheduled: Daily report at 8:00 AM")
    
    # Start the scheduler
    scheduler.start()
    logger.info("✅ Background scheduler started successfully")
    
    # Print all scheduled jobs
    print_scheduled_jobs()

def stop_scheduler():
    """
    Gracefully stop the scheduler
    """
    global scheduler
    
    if scheduler is not None:
        scheduler.shutdown(wait=True)
        scheduler = None
        logger.info("🛑 Scheduler stopped")

def print_scheduled_jobs():
    """
    Print all scheduled jobs for debugging
    """
    if scheduler is None:
        return
    
    print("\n" + "="*60)
    print("⏰ Scheduled Background Jobs:")
    print("="*60)
    
    for job in scheduler.get_jobs():
        print(f"  • {job.name}")
        print(f"    ID: {job.id}")
        print(f"    Next run: {job.next_run_time}")
        print()
    
    print("="*60 + "\n")

# ===============================================================
# Manual Trigger Functions (for testing)
# ===============================================================

async def trigger_sync_now():
    """
    Manually trigger sync (useful for testing or API endpoint)
    """
    logger.info("🔧 Manual sync triggered")
    await sync_elasticsearch_to_postgres()

async def trigger_cleanup_now():
    """
    Manually trigger cleanup
    """
    logger.info("🔧 Manual cleanup triggered")
    await cleanup_old_events()

# ===============================================================
# Health Check
# ===============================================================

def get_scheduler_status():
    """
    Get current scheduler status and job information
    """
    if scheduler is None:
        return {
            "status": "stopped",
            "jobs": []
        }
    
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": str(job.next_run_time),
            "trigger": str(job.trigger)
        })
    
    return {
        "status": "running",
        "jobs": jobs,
        "running": scheduler.running
    }