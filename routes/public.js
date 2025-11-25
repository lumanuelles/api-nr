import { Router } from 'express';
import pool from '../lib/db.js';

const router = Router();

router.get('/produtos', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, nome, preco, imagens FROM produto ORDER BY id');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos.' });
    }
});

router.get('/instrumentos', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, nome, descricao FROM instrumento ORDER BY id');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar instrumentos:', error);
        res.status(500).json({ error: 'Erro ao buscar instrumentos.' });
    }
});

router.get('/professores', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT p.id, p.nome, json_agg(json_build_object('id', i.id, 'nome', i.nome)) FILTER (WHERE i.id IS NOT NULL) AS instrumentos
            FROM professor p
            LEFT JOIN professor_instrumento pi ON pi.professor_id = p.id
            LEFT JOIN instrumento i ON i.id = pi.instrumento_id
            GROUP BY p.id
            ORDER BY p.id
        `);

        res.json(rows.map(r => ({ id: r.id, nome: r.nome, instrumentos: r.instrumentos || [] })));
    } catch (error) {
        console.error('Erro ao listar professores:', error);
        res.status(500).json({ error: 'Erro ao buscar professores.' });
    }
});

export default router;