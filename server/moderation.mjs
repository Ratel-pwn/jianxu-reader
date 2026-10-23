export function resolveReport(db, id, decision, now = Date.now()) {
  if (!Number.isSafeInteger(id) || id < 1 || !['keep', 'remove'].includes(decision)) throw new Error('Invalid moderation decision');
  db.exec('BEGIN IMMEDIATE');
  try {
    const report = db.prepare("SELECT * FROM reports WHERE id=? AND status='pending'").get(id);
    if (!report) throw new Error('Pending report not found');
    db.prepare('INSERT INTO moderation_actions(report_id,post_id,decision,created_at) VALUES(?,?,?,?)').run(id, report.post_id, decision, now);
    db.prepare('UPDATE reports SET status=? WHERE id=?').run(decision === 'keep' ? 'dismissed' : 'removed', id);
    if (decision === 'remove') db.prepare('DELETE FROM posts WHERE id=?').run(report.post_id);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
