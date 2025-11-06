const express = require('express');
const Product = require('../models/Product');
const { authenticateJWT, requireAdmin } = require('../middleware/authenticateJWT');

const router = express.Router();

// Obtener todos los productos (público)
router.get('/', async (req, res) => {
    try {
        const { league, category, inStock, search } = req.query;
        
        let filter = { isActive: true };
        
        // Filtros opcionales
        if (league && league !== 'all') {
            filter.league = league;
        }
        
        if (category && category !== 'all') {
            filter.category = category;
        }
        
        if (inStock === 'true') {
            filter.stock = { $gt: 0 };
        }
        
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const products = await Product.find(filter)
            .populate('createdBy', 'username')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: products.length,
            products: products
        });
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo productos',
            error: error.message
        });
    }
});

// Obtener producto por ID (público)
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('createdBy', 'username email');
        
        if (!product || !product.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        res.json({
            success: true,
            product: product
        });
    } catch (error) {
        console.error('Error obteniendo producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo producto',
            error: error.message
        });
    }
});

// Crear producto (solo admin)
router.post('/', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const productData = {
            ...req.body,
            createdBy: req.user.userId
        };
        
        const product = new Product(productData);
        await product.save();
        
        await product.populate('createdBy', 'username');
        
        res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente',
            product: product
        });
    } catch (error) {
        console.error('Error creando producto:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Datos de producto inválidos',
                errors: Object.values(error.errors).map(e => e.message)
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creando producto',
            error: error.message
        });
    }
});

// Actualizar producto (solo admin)
router.put('/:id', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('createdBy', 'username');
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Producto actualizado exitosamente',
            product: product
        });
    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.status(400).json({
            success: false,
            message: 'Error actualizando producto',
            error: error.message
        });
    }
});

// Eliminar producto (solo admin) - Eliminación suave
router.delete('/:id', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Producto eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error eliminando producto',
            error: error.message
        });
    }
});

// Obtener estadísticas de productos (solo admin)
router.get('/admin/stats', authenticateJWT, requireAdmin, async (req, res) => {
    try {
        const stats = await Product.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$league',
                    totalProducts: { $sum: 1 },
                    totalStock: { $sum: '$stock' },
                    averagePrice: { $avg: '$price' },
                    totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
                }
            }
        ]);
        
        const totalProducts = await Product.countDocuments({ isActive: true });
        const outOfStock = await Product.countDocuments({ stock: 0, isActive: true });
        
        res.json({
            success: true,
            stats: {
                byLeague: stats,
                totalProducts,
                outOfStock,
                inStock: totalProducts - outOfStock
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo estadísticas',
            error: error.message
        });
    }
});

module.exports = router;