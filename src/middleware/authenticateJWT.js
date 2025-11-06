const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
            
            // Verificar que el usuario aún existe en la BD
            const user = await User.findById(decoded.userId).select('-password');
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            req.user = {
                userId: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            };
            
            next();
        } catch (error) {
            console.error('Error verificando token:', error);
            return res.status(403).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }
    } else {
        return res.status(401).json({
            success: false,
            message: 'Token de autenticación requerido'
        });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Se requieren permisos de administrador'
        });
    }
};

const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
            const user = await User.findById(decoded.userId).select('-password');
            
            if (user) {
                req.user = {
                    userId: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                };
            }
        } catch (error) {
            // Si el token es inválido, continuamos sin usuario
            console.log('Token opcional inválido, continuando como invitado');
        }
    }
    
    next();
};

module.exports = {
    authenticateJWT,
    requireAdmin,
    optionalAuth
};