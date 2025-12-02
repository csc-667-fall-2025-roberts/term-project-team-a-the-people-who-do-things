import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
	const { email, password, displayName } = req.body;

	console.log('Signup attempt:', { email, displayName });

	try {

		if (!email || !password || !displayName) {
			console.log('Missing fields');
			return res.status(400).json({ error: 'All fields are required' });
		}

		if (password.length < 6) {
			console.log('Password too short');
			return res.status(400).json({ error: 'Password must be at least 6 characters' });
		}

		const passwordHash = await bcrypt.hash(password, 10);

		console.log('Inserting user into database...');
		const result = await pool.query(
			`INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name`,
			[email, passwordHash, displayName]
		);

		console.log('User created:', result.rows[0]);
		const user = result.rows[0];
		req.session.userId = user.id;

        res.json({ success: true, user });
    } catch (error) {
        if ((error as any).code === '23505') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
	const { email, password } = req.body;

	try {
		const result = await pool.query(
			'SELECT id, email, password_hash, display_name FROM users WHERE email = $1',
			[email]
		);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

		const user = result.rows[0];
		const valid = await bcrypt.compare(password, user.password_hash);

		if (!valid) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		req.session.userId = user.id;

		res.json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				display_name: user.display_name
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ error: 'Server error' });
	}
});

router.post('/logout', (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			return res.status(500).json({ error: 'Failed to logout' });
		}
		res.json({ success: true });
	});
});

router.get('/me', async (req, res) => {
	if (!req.session.userId) {
		return res.status(401).json({ error: 'Not authenticated' });
	}

	try {
		const result = await pool.query(
			'SELECT id, email, display_name FROM users WHERE id = $1',
			[req.session.userId]
		);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

		res.json({ user: result.rows[0] });
	} catch (error) {
		console.error('Get user error:', error);
		res.status(500).json({ error: 'Server error' });
	}
});

export default router;
