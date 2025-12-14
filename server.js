import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';

dotenv.config();  // Carrega as variáveis de ambiente

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rotas
app.get('/', (req, res) => res.json({ status: 'ok' }));
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

// Tratamento de erros e rotas não encontradas
app.use((req, res) => {
res.status(404).json({ error: 'Recurso não encontrado.' });
});
app.use((err, req, res, next) => {
console.error('Erro:', err);
res.status(500).json({ error: 'Erro interno do servidor' });
});

// Inicia o servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
console.log(`Servidor rodando na porta ${port}`);
});
