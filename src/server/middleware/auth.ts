export const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.redirect('/login');
    }
    next();
};

export const attachUser = async (req, res, next) => {
    if (req.session.userId) {
        try {
            const pool = (await import('../config/database.js')).default;
            const result = await pool.query(
                'SELECT id, email, display_name FROM users WHERE id = $1',
                [req.session.userId]
            );
            if (result.rows.length > 0) {
                req.user = result.rows[0];
                res.locals.user = req.user;
            }
        } catch (error) {
            console.error('Error attaching user:', error);
        }
    }
    next();
};