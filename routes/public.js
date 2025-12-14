import { Router } from 'express';
import pool from '../lib/db.js';

const router = Router();


// Lista todos os produtos
router.get('/produtos', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, nome, preco, imagens, estoque FROM produto ORDER BY id');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos.' });
    }
});

// Busca produto específico por ID
router.get('/produtos/:id', async (req, res) => {
    const { id } = req.params;
    if (!/^[0-9]+$/.test(id)) {
        return res.status(400).json({ error: 'ID inválido.' });
    }
    try {
        const { rows } = await pool.query('SELECT id, nome, preco, imagens, estoque FROM produto WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro ao buscar produto.' });
    }
});

export default router;