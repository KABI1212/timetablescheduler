const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const backendDir = path.resolve(__dirname, '../..');

const timestampForFile = () => new Date().toISOString().replace(/[:.]/g, '-');

const listBackupFiles = () => fs.readdirSync(backendDir)
    .filter((name) => /^database\.backup\..+\.json$/.test(name))
    .map((name) => {
        const fullPath = path.join(backendDir, name);
        const stats = fs.statSync(fullPath);
        return {
            filename: name,
            created_at: stats.birthtime.toISOString(),
            modified_at: stats.mtime.toISOString(),
            size: stats.size
        };
    })
    .sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));

const createBackupFile = () => {
    const source = db.getDatabasePath();
    if (!fs.existsSync(source)) {
        const error = new Error('database.json was not found.');
        error.statusCode = 404;
        throw error;
    }

    const filename = `database.backup.${timestampForFile()}.json`;
    const destination = path.join(backendDir, filename);
    fs.copyFileSync(source, destination);
    return { filename, created_at: new Date().toISOString() };
};

exports.listBackups = async (_req, res) => {
    try {
        res.json(listBackupFiles());
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Unable to list backups' });
    }
};

exports.backupDatabase = async (_req, res) => {
    try {
        const backup = createBackupFile();

        res.status(201).json({
            message: 'Database backup created.',
            backup
        });
    } catch (err) {
        console.error(err);
        res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Unable to create backup' });
    }
};

exports.restoreDatabase = async (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) {
            return res.json({
                message: 'Choose a backup filename to restore.',
                backups: listBackupFiles()
            });
        }

        const requestedPath = path.resolve(backendDir, filename);
        if (!requestedPath.startsWith(`${backendDir}${path.sep}`) || !/^database\.backup\..+\.json$/.test(filename)) {
            return res.status(400).json({ error: 'Invalid backup filename.' });
        }

        if (!fs.existsSync(requestedPath)) {
            return res.status(404).json({ error: 'Backup file not found.' });
        }

        const safetyBackup = createBackupFile();

        const restored = JSON.parse(fs.readFileSync(requestedPath, 'utf8'));
        db.replaceRawData(restored);

        res.json({
            message: 'Database restored successfully.',
            filename,
            safety_backup: safetyBackup.filename
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Unable to restore backup' });
    }
};
