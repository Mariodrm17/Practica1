class BasketballStore {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = null;
        this.socket = null;
        this.products = [];
        this.API_BASE = window.location.origin; // Esto se adapta automáticamente a Render
        this.init();
    }

    async loadProducts() {
        try {
            console.log('🔄 Cargando productos desde:', `${this.API_BASE}/api/products`);
            const productsList = document.getElementById('products-list');
            productsList.innerHTML = '<div class="loading">Cargando productos... 🏀</div>';

            const response = await fetch(`${this.API_BASE}/api/products`);
            
            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            
            this.products = await response.json();
            console.log(`✅ ${this.products.length} productos cargados:`, this.products);
            
            this.renderProducts(this.products);
        } catch (error) {
            console.error('❌ Error cargando productos:', error);
            const productsList = document.getElementById('products-list');
            productsList.innerHTML = `
                <div class="error">
                    <h3>Error cargando productos</h3>
                    <p>${error.message}</p>
                    <p>URL intentada: ${this.API_BASE}/api/products</p>
                    <button onclick="app.loadProducts()">🔄 Reintentar</button>
                    <button onclick="app.testConnection()">🔧 Probar conexión</button>
                </div>
            `;
        }
    }

    async testConnection() {
        try {
            console.log('🔧 Probando conexión con el servidor...');
            
            const tests = [
                `${this.API_BASE}/api/health`,
                `${this.API_BASE}/api/debug/products`,
                `${this.API_BASE}/api/products`
            ];
            
            for (const url of tests) {
                const response = await fetch(url);
                console.log(`📡 ${url}: ${response.status} ${response.statusText}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ ${url}:`, data);
                }
            }
            
            this.showNotification('✅ Pruebas de conexión completadas - Revisa la consola', 'success');
        } catch (error) {
            console.error('❌ Error en prueba de conexión:', error);
            this.showNotification('❌ Error en prueba de conexión', 'error');
        }
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.setupNavigation();
    }

    async checkAuth() {
        if (this.token) {
            try {
                const response = await fetch('/api/auth/verify', {
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
            const response = await fetch('/api/auth/login', {
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
            const response = await fetch('/api/auth/register', {
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
            const productsList = document.getElementById('products-list');
            productsList.innerHTML = '<div class="loading">Cargando productos... 🏀</div>';

            const response = await fetch('/api/products');
            this.products = await response.json();
            
            this.renderProducts(this.products);
        } catch (error) {
            console.error('Error cargando productos:', error);
            document.getElementById('products-list').innerHTML = '<div class="error">Error cargando productos</div>';
        }
    }

    renderProducts(products) {
        const productsList = document.getElementById('products-list');
        productsList.innerHTML = '';

        if (products.length === 0) {
            productsList.innerHTML = '<div class="no-products">No hay productos disponibles</div>';
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
                <div class="stock">🏀 Stock: ${product.stock} unidades</div>
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
            default:
                filteredProducts = this.products;
        }

        this.renderProducts(filteredProducts);
    }

    async createProduct() {
        const form = document.getElementById('create-product-form');
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/api/products', {
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

            if (response.ok) {
                this.showNotification('¡Producto creado exitosamente! 🎉', 'success');
                form.reset();
                showProducts();
                this.loadProducts();
            } else {
                const data = await response.json();
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error creando producto:', error);
            this.showNotification('Error creando producto', 'error');
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
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        // Estilos para la notificación
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

        // Auto-remover después de 4 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 4000);
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
    
    // Scroll al final del chat
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
            // Aquí podrías implementar un modal de edición
            const newName = prompt('Nuevo nombre:', product.name);
            if (newName) {
                updateProduct(productId, { name: newName });
            }
        }
    }
}

async function updateProduct(productId, updates) {
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${app.token}`
            },
            body: JSON.stringify(updates)
        });

        if (response.ok) {
            app.showNotification('Producto actualizado ✅', 'success');
            app.loadProducts();
        } else {
            app.showNotification('Error actualizando producto', 'error');
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
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${app.token}`
                }
            });

            if (response.ok) {
                app.showNotification('Producto eliminado 🗑️', 'success');
                app.loadProducts();
            } else {
                app.showNotification('Error eliminando producto', 'error');
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

// Añadir estilos CSS para las notificaciones
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
    }
    
    .no-products {
        text-align: center;
        padding: 3rem;
        color: #666;
        font-size: 1.1rem;
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
`;
document.head.appendChild(style);