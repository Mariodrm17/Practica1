class BasketballStore {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = null;
        this.socket = null;
        this.products = [];
        this.API_BASE = window.location.origin;
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.setupNavigation();
    }

    async checkAuth() {
        if (this.token) {
            try {
                const response = await fetch(`${this.API_BASE}/api/auth/verify`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.user = data.user;
                    this.showAuthenticatedUI();
                    this.connectToChat();
                    this.loadProducts();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Error verificando autenticación:', error);
                this.logout();
            }
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Register form
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Message form
        document.getElementById('message-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Create product form
        const createProductForm = document.getElementById('create-product-form');
        if (createProductForm) {
            createProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createProduct();
            });
        }

        // Message input typing indicator
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            let typingTimer;
            messageInput.addEventListener('input', () => {
                if (this.socket) {
                    this.socket.emit('typing', {
                        username: this.user.username,
                        isTyping: true
                    });

                    clearTimeout(typingTimer);
                    typingTimer = setTimeout(() => {
                        this.socket.emit('typing', {
                            username: this.user.username,
                            isTyping: false
                        });
                    }, 1000);
                }
            });
        }
    }

    setupNavigation() {
        // Filtros de productos
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.filterProducts(filter);
                
                // Actualizar botones activos
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    async login() {
        const form = document.getElementById('login-form');
        const inputs = form.querySelectorAll('input');
        const submitBtn = form.querySelector('button');
        
        submitBtn.textContent = 'Entrando...';
        submitBtn.disabled = true;

        try {
            const response = await fetch(`${this.API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: inputs[0].value,
                    password: inputs[1].value
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('token', this.token);
                this.showAuthenticatedUI();
                this.connectToChat();
                this.loadProducts();
                this.showNotification('¡Bienvenido de nuevo! 🏀', 'success');
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showNotification('Error de conexión', 'error');
        } finally {
            submitBtn.textContent = 'Entrar';
            submitBtn.disabled = false;
        }
    }

    async register() {
        const form = document.getElementById('register-form');
        const inputs = form.querySelectorAll('input');
        const submitBtn = form.querySelector('button');
        
        submitBtn.textContent = 'Registrando...';
        submitBtn.disabled = true;

        try {
            const response = await fetch(`${this.API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: inputs[0].value,
                    email: inputs[1].value,
                    password: inputs[2].value
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('¡Registro exitoso! Por favor inicia sesión.', 'success');
                showLogin();
                form.reset();
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error en registro:', error);
            this.showNotification('Error de conexión', 'error');
        } finally {
            submitBtn.textContent = 'Registrarse';
            submitBtn.disabled = false;
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        document.getElementById('auth-buttons').style.display = 'block';
        document.getElementById('user-menu').style.display = 'none';
        document.getElementById('products-section').style.display = 'none';
        document.getElementById('chat-section').style.display = 'none';
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('register-section').style.display = 'none';
        document.getElementById('create-product-section').style.display = 'none';

        this.showNotification('¡Sesión cerrada! 👋', 'info');
    }

    showAuthenticatedUI() {
        document.getElementById('auth-buttons').style.display = 'none';
        document.getElementById('user-menu').style.display = 'block';
        document.getElementById('username-display').textContent = `🏀 ${this.user.username} (${this.user.role})`;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('register-section').style.display = 'none';
        document.getElementById('products-section').style.display = 'block';

        // Mostrar panel de admin si es administrador
        if (this.user.role === 'admin') {
            document.getElementById('admin-panel').style.display = 'block';
        } else {
            document.getElementById('admin-panel').style.display = 'none';
        }

        this.loadProducts();
    }

    async loadProducts() {
        try {
            console.log('🔄 Cargando productos...');
            const productsList = document.getElementById('products-list');
            productsList.innerHTML = '<div class="loading">Cargando productos... 🏀</div>';

            const response = await fetch(`${this.API_BASE}/api/products`);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📦 Respuesta de la API:', data);
            
            // CORRECCIÓN: Ahora los productos están en data.products
            if (data.success && Array.isArray(data.products)) {
                this.products = data.products;
                console.log(`✅ ${this.products.length} productos cargados`);
                this.renderProducts(this.products);
            } else {
                throw new Error('Formato de respuesta inválido');
            }
            
        } catch (error) {
            console.error('❌ Error cargando productos:', error);
            const productsList = document.getElementById('products-list');
            productsList.innerHTML = `
                <div class="error">
                    <h3>Error cargando productos</h3>
                    <p>${error.message}</p>
                    <button onclick="app.loadProducts()">🔄 Reintentar</button>
                    <button onclick="app.testConnection()">🔧 Probar conexión</button>
                </div>
            `;
        }
    }

    renderProducts(products) {
        const productsList = document.getElementById('products-list');
        productsList.innerHTML = '';

        if (!products || products.length === 0) {
            productsList.innerHTML = `
                <div class="no-products">
                    <h3>🏀 No hay productos disponibles</h3>
                    <p>No se encontraron productos en la tienda.</p>
                    ${this.user && this.user.role === 'admin' ? 
                        '<button onclick="showCreateProduct()">➕ Crear primer producto</button>' : 
                        '<p>Vuelve más tarde o contacta al administrador.</p>'
                    }
                </div>
            `;
            return;
        }

        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <div class="league-badge ${product.league === 'NBA' ? 'nba-badge' : product.league === 'ACB' ? 'acb-badge' : 'both-badge'}">
                    ${product.league}
                </div>
                <h3>${product.name}</h3>
                <p class="description">${product.description}</p>
                <div class="price">€${product.price}</div>
                <span class="category">${product.category}</span>
                <div class="stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                    ${product.stock > 0 ? `🏀 Stock: ${product.stock} unidades` : '❌ Agotado'}
                </div>
                ${this.user && this.user.role === 'admin' ? `
                    <div class="admin-actions">
                        <button class="edit-btn" onclick="editProduct('${product._id}')">✏️ Editar</button>
                        <button class="delete-btn" onclick="deleteProduct('${product._id}')">🗑️ Eliminar</button>
                    </div>
                ` : ''}
            `;
            productsList.appendChild(productCard);
        });
    }

    filterProducts(filter) {
        let filteredProducts = this.products;
        
        if (!filteredProducts || !Array.isArray(filteredProducts)) {
            console.error('No hay productos para filtrar');
            return;
        }
        
        switch (filter) {
            case 'nba':
                filteredProducts = this.products.filter(p => p.league === 'NBA');
                break;
            case 'acb':
                filteredProducts = this.products.filter(p => p.league === 'ACB');
                break;
            case 'balls':
                filteredProducts = this.products.filter(p => p.category === 'Balones');
                break;
            case 'jerseys':
                filteredProducts = this.products.filter(p => p.category === 'Camisetas');
                break;
            case 'shoes':
                filteredProducts = this.products.filter(p => p.category === 'Calzado');
                break;
            case 'under50':
                filteredProducts = this.products.filter(p => p.price < 50);
                break;
            case 'in-stock':
                filteredProducts = this.products.filter(p => p.stock > 0);
                break;
            default:
                filteredProducts = this.products;
        }

        this.renderProducts(filteredProducts);
    }

    async createProduct() {
        const form = document.getElementById('create-product-form');
        const formData = new FormData(form);
        
        try {
            const response = await fetch(`${this.API_BASE}/api/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    name: formData.get('name'),
                    description: formData.get('description'),
                    price: parseFloat(formData.get('price')),
                    category: formData.get('category'),
                    league: formData.get('league'),
                    stock: parseInt(formData.get('stock')),
                    image: formData.get('image') || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400'
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showNotification('¡Producto creado exitosamente! 🎉', 'success');
                form.reset();
                showProducts();
                this.loadProducts();
            } else {
                this.showNotification(data.message || 'Error creando producto', 'error');
            }
        } catch (error) {
            console.error('Error creando producto:', error);
            this.showNotification('Error de conexión', 'error');
        }
    }

    connectToChat() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Conectado al chat');
            this.socket.emit('joinChat', {
                username: this.user.username,
                role: this.user.role
            });
        });

        this.socket.on('newMessage', (data) => {
            this.displayMessage(data);
        });

        this.socket.on('userJoined', (user) => {
            this.displaySystemMessage(`🎉 ${user.username} se unió al chat`);
        });

        this.socket.on('userLeft', (user) => {
            this.displaySystemMessage(`👋 ${user.username} abandonó el chat`);
        });

        this.socket.on('typing', (data) => {
            this.showTypingIndicator(data);
        });
    }

    sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();

        if (message && this.socket) {
            this.socket.emit('sendMessage', {
                username: this.user.username,
                message: message,
                timestamp: new Date().toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
            });
            input.value = '';
        }
    }

    displayMessage(data) {
        const messages = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.innerHTML = `
            <span class="user">${data.username}:</span>
            <span>${data.message}</span>
            <span class="timestamp">${data.timestamp}</span>
        `;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    displaySystemMessage(message) {
        const messages = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.innerHTML = `<em>${message}</em>`;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    showTypingIndicator(data) {
        const indicator = document.getElementById('typing-indicator');
        if (data.isTyping) {
            indicator.textContent = `✍️ ${data.username} está escribiendo...`;
        } else {
            indicator.textContent = '';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 1rem;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 4000);
    }

    async testConnection() {
        try {
            console.log('🔧 Probando conexión con el servidor...');
            
            const tests = [
                `${this.API_BASE}/api/health`,
                `${this.API_BASE}/api/products`,
                `${this.API_BASE}/api/debug/database`
            ];
            
            for (const url of tests) {
                const response = await fetch(url);
                const data = await response.json();
                console.log(`📡 ${url}:`, data);
            }
            
            this.showNotification('✅ Pruebas de conexión completadas - Revisa la consola', 'success');
        } catch (error) {
            console.error('❌ Error en prueba de conexión:', error);
            this.showNotification('❌ Error en prueba de conexión', 'error');
        }
    }
}

// Funciones globales para los botones
function showLogin() {
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('products-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none';
    document.getElementById('create-product-section').style.display = 'none';
}

function showRegister() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'block';
    document.getElementById('products-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none';
    document.getElementById('create-product-section').style.display = 'none';
}

function showProducts() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('products-section').style.display = 'block';
    document.getElementById('chat-section').style.display = 'none';
    document.getElementById('create-product-section').style.display = 'none';
    app.loadProducts();
}

function showChat() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('products-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'block';
    document.getElementById('create-product-section').style.display = 'none';
    
    setTimeout(() => {
        const messages = document.getElementById('messages');
        if (messages) {
            messages.scrollTop = messages.scrollHeight;
        }
    }, 100);
}

function showCreateProduct() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('products-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none';
    document.getElementById('create-product-section').style.display = 'block';
}

function logout() {
    app.logout();
}

function editProduct(productId) {
    const product = app.products.find(p => p._id === productId);
    if (product) {
        if (confirm(`¿Editar producto: ${product.name}?`)) {
            const newName = prompt('Nuevo nombre:', product.name);
            if (newName) {
                updateProduct(productId, { name: newName });
            }
        }
    }
}

async function updateProduct(productId, updates) {
    try {
        const response = await fetch(`${app.API_BASE}/api/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${app.token}`
            },
            body: JSON.stringify(updates)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            app.showNotification('Producto actualizado ✅', 'success');
            app.loadProducts();
        } else {
            app.showNotification(data.message || 'Error actualizando producto', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        app.showNotification('Error de conexión', 'error');
    }
}

async function deleteProduct(productId) {
    const product = app.products.find(p => p._id === productId);
    if (product && confirm(`¿Estás seguro de eliminar "${product.name}"?`)) {
        try {
            const response = await fetch(`${app.API_BASE}/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${app.token}`
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                app.showNotification('Producto eliminado 🗑️', 'success');
                app.loadProducts();
            } else {
                app.showNotification(data.message || 'Error eliminando producto', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            app.showNotification('Error de conexión', 'error');
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BasketballStore();
});

// Añadir estilos CSS para las notificaciones y estados
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .notification button {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .loading {
        text-align: center;
        padding: 2rem;
        font-size: 1.2rem;
        color: #666;
    }
    
    .error {
        text-align: center;
        padding: 2rem;
        color: #EF4444;
        font-size: 1.1rem;
        background: #FEF2F2;
        border-radius: 8px;
        margin: 1rem 0;
    }
    
    .error button {
        margin: 0.5rem;
        padding: 0.5rem 1rem;
    }
    
    .no-products {
        text-align: center;
        padding: 3rem;
        color: #666;
        font-size: 1.1rem;
        background: #F9FAFB;
        border-radius: 8px;
    }
    
    .filter-buttons {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
    }
    
    .filter-btn {
        padding: 0.5rem 1rem;
        background: #E5E7EB;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .filter-btn:hover, .filter-btn.active {
        background: #3B82F6;
        color: white;
    }
    
    .both-badge {
        background: linear-gradient(135deg, #1D428A 0%, #FF6B00 100%);
    }
    
    .in-stock {
        color: #059669;
        font-weight: bold;
    }
    
    .out-of-stock {
        color: #DC2626;
        font-weight: bold;
    }
    
    .product-card {
        transition: all 0.3s ease;
    }
    
    .product-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    }
`;
document.head.appendChild(style);