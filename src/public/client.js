class BasketballStore {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = null;
        this.socket = null;
        this.products = [];
        this.cart = { items: [], total: 0 };
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
                    this.loadCart();
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

        // Modal events
        this.setupModalEvents();
    }

    setupModalEvents() {
        const modal = document.getElementById('product-modal');
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('.cancel-btn');
        const addToCartBtn = document.getElementById('add-to-cart-modal-btn');

        closeBtn.onclick = () => this.hideModal();
        cancelBtn.onclick = () => this.hideModal();
        
        addToCartBtn.onclick = () => this.addToCartFromModal();

        // Cerrar modal al hacer click fuera
        modal.onclick = (e) => {
            if (e.target === modal) this.hideModal();
        };
    }

    setupNavigation() {
        // Filtros de productos
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.filterProducts(filter);
                
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
        document.getElementById('cart-section').style.display = 'none';

        this.showNotification('¡Sesión cerrada! 👋', 'info');
    }

    showAuthenticatedUI() {
        document.getElementById('auth-buttons').style.display = 'none';
        document.getElementById('user-menu').style.display = 'block';
        document.getElementById('username-display').textContent = `🏀 ${this.user.username} (${this.user.role})`;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('register-section').style.display = 'none';
        document.getElementById('products-section').style.display = 'block';

        if (this.user.role === 'admin') {
            document.getElementById('admin-panel').style.display = 'block';
        } else {
            document.getElementById('admin-panel').style.display = 'none';
        }

        this.loadProducts();
        this.loadCart();
    }

    async loadProducts() {
        try {
            const productsList = document.getElementById('products-list');
            productsList.innerHTML = '<div class="loading">Cargando productos... 🏀</div>';

            const response = await fetch(`${this.API_BASE}/api/products`);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && Array.isArray(data.products)) {
                this.products = data.products;
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
                <button onclick="app.showProductModal('${product._id}')" 
                        class="add-to-cart-product-btn" 
                        ${product.stock === 0 ? 'disabled' : ''}>
                    ${product.stock === 0 ? '❌ Agotado' : '🛒 Añadir al Carrito'}
                </button>
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

    // ================== CARRITO DE COMPRAS ==================
    
    async loadCart() {
        if (!this.user) return;
        
        try {
            const response = await fetch(`${this.API_BASE}/api/cart`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.cart = data.cart;
                this.updateCartUI();
            }
        } catch (error) {
            console.error('Error cargando carrito:', error);
        }
    }
    
    async addToCart(productId, quantity = 1, size = null) {
        try {
            const response = await fetch(`${this.API_BASE}/api/cart/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    productId: productId,
                    quantity: quantity,
                    size: size
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.cart = data.cart;
                this.updateCartUI();
                this.showNotification('✅ Producto añadido al carrito', 'success');
                return true;
            } else {
                this.showNotification(data.message || 'Error añadiendo al carrito', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error añadiendo al carrito:', error);
            this.showNotification('Error de conexión', 'error');
            return false;
        }
    }
    
    async removeFromCart(itemId) {
        try {
            const response = await fetch(`${this.API_BASE}/api/cart/remove/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.cart = data.cart;
                this.updateCartUI();
                this.showNotification('Producto eliminado del carrito', 'success');
            } else {
                this.showNotification(data.message || 'Error eliminando del carrito', 'error');
            }
        } catch (error) {
            console.error('Error eliminando del carrito:', error);
            this.showNotification('Error de conexión', 'error');
        }
    }
    
    async updateCartQuantity(itemId, quantity) {
        try {
            const response = await fetch(`${this.API_BASE}/api/cart/update/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ quantity: quantity })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.cart = data.cart;
                this.updateCartUI();
            } else {
                this.showNotification(data.message || 'Error actualizando cantidad', 'error');
            }
        } catch (error) {
            console.error('Error actualizando carrito:', error);
            this.showNotification('Error de conexión', 'error');
        }
    }

    async clearCart() {
        if (!confirm('¿Estás seguro de que quieres vaciar el carrito?')) return;
        
        try {
            const response = await fetch(`${this.API_BASE}/api/cart/clear`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.cart = data.cart;
                this.updateCartUI();
                this.showNotification('Carrito vaciado', 'success');
            } else {
                this.showNotification(data.message || 'Error vaciando carrito', 'error');
            }
        } catch (error) {
            console.error('Error vaciando carrito:', error);
            this.showNotification('Error de conexión', 'error');
        }
    }

    checkout() {
        if (this.cart.items.length === 0) {
            this.showNotification('El carrito está vacío', 'error');
            return;
        }
        this.showNotification('🚧 Función de pago en desarrollo', 'info');
    }
    
    updateCartUI() {
        const cartCount = document.getElementById('cart-count');
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        
        // Actualizar contador
        if (cartCount) {
            const totalItems = this.cart ? this.cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'inline-flex' : 'none';
        }
        
        // Actualizar items del carrito
        if (cartItems && this.cart) {
            if (this.cart.items.length === 0) {
                cartItems.innerHTML = '<p class="empty-cart">Tu carrito está vacío</p>';
            } else {
                cartItems.innerHTML = this.cart.items.map(item => `
                    <div class="cart-item">
                        <img src="${item.product.image}" alt="${item.product.name}" class="cart-item-image">
                        <div class="cart-item-details">
                            <h4>${item.product.name}</h4>
                            <p>€${item.price} x ${item.quantity}</p>
                            ${item.size ? `<p><strong>Talla:</strong> ${item.size}</p>` : ''}
                            <p><strong>Subtotal:</strong> €${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        <div class="cart-item-actions">
                            <button onclick="app.updateCartQuantity('${item._id}', ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                            <span>${item.quantity}</span>
                            <button onclick="app.updateCartQuantity('${item._id}', ${item.quantity + 1})">+</button>
                            <button onclick="app.removeFromCart('${item._id}')" class="remove-btn">🗑️</button>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        // Actualizar total
        if (cartTotal && this.cart) {
            cartTotal.textContent = `Total: €${this.cart.total ? this.cart.total.toFixed(2) : '0.00'}`;
        }
    }

    // ================== MODAL DE PRODUCTO ==================
    
    showProductModal(productId) {
        const product = this.products.find(p => p._id === productId);
        if (!product) return;
        
        const modal = document.getElementById('product-modal');
        const sizeSelection = document.getElementById('size-selection');
        const sizeSelect = document.getElementById('size-select');
        
        // Llenar datos del modal
        document.getElementById('modal-product-name').textContent = product.name;
        document.getElementById('modal-product-image').src = product.image;
        document.getElementById('modal-product-image').alt = product.name;
        document.getElementById('modal-product-description').textContent = product.description;
        document.getElementById('modal-product-price').textContent = `€${product.price}`;
        document.getElementById('quantity-select').value = 1;
        document.getElementById('quantity-select').max = product.stock;
        
        // Manejar tallas
        if (product.sizes && product.sizes.length > 0) {
            sizeSelection.style.display = 'block';
            sizeSelect.innerHTML = '<option value="">Selecciona una talla</option>' +
                product.sizes.map(size => `<option value="${size}">${size}</option>`).join('');
        } else {
            sizeSelection.style.display = 'none';
        }
        
        // Configurar botón
        const addButton = document.getElementById('add-to-cart-modal-btn');
        addButton.disabled = product.stock === 0;
        addButton.textContent = product.stock === 0 ? '❌ Agotado' : '🛒 Añadir al Carrito';
        addButton.onclick = () => this.addToCartFromModal(productId);
        
        modal.style.display = 'flex';
    }
    
    hideModal() {
        document.getElementById('product-modal').style.display = 'none';
    }
    
    async addToCartFromModal(productId) {
        const sizeSelect = document.getElementById('size-select');
        const quantityInput = document.getElementById('quantity-select');
        
        const size = sizeSelect && sizeSelect.style.display !== 'none' ? sizeSelect.value : null;
        const quantity = parseInt(quantityInput.value);
        
        const product = this.products.find(p => p._id === productId);
        
        // Validaciones
        if (quantity < 1) {
            this.showNotification('La cantidad debe ser al menos 1', 'error');
            return;
        }
        
        if (quantity > product.stock) {
            this.showNotification(`Solo hay ${product.stock} unidades disponibles`, 'error');
            return;
        }
        
        if ((product.category === 'Camisetas' || product.category === 'Calzado' || product.category === 'Ropa') && !size) {
            this.showNotification('Por favor selecciona una talla', 'error');
            return;
        }
        
        const success = await this.addToCart(productId, quantity, size);
        if (success) {
            this.hideModal();
        }
    }

    // ================== CHAT PERSISTENTE ==================
    
    connectToChat() {
    this.socket = io();

    this.socket.on('connect', () => {
        console.log('Conectado al chat');
        this.socket.emit('joinChat', {
            userId: this.user.userId, // ← Asegurar que enviamos userId
            username: this.user.username,
            role: this.user.role
        });
    });

    this.socket.on('chatHistory', (messages) => {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';
        
        messages.forEach(message => {
            if (message.type === 'message') {
                this.displayMessage({
                    username: message.username,
                    message: message.message,
                    timestamp: new Date(message.createdAt).toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })
                });
            } else {
                // Mensajes del sistema
                this.displaySystemMessage(message.message);
            }
        });
    });

    this.socket.on('newMessage', (data) => {
        this.displayMessage(data);
    });

    this.socket.on('userJoined', (user) => {
        this.displaySystemMessage(`🎉 ${user.username} se unió al chat`);
    });

    this.socket.on('typing', (data) => {
        this.showTypingIndicator(data);
    });

    this.socket.on('messageError', (data) => {
        this.showNotification('Error enviando mensaje', 'error');
    });
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
}

// ================== FUNCIONES GLOBALES ==================

function showLogin() {
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('products-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none';
    document.getElementById('create-product-section').style.display = 'none';
    document.getElementById('cart-section').style.display = 'none';
}

function showRegister() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'block';
    document.getElementById('products-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none';
    document.getElementById('create-product-section').style.display = 'none';
    document.getElementById('cart-section').style.display = 'none';
}

function showProducts() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('products-section').style.display = 'block';
    document.getElementById('chat-section').style.display = 'none';
    document.getElementById('create-product-section').style.display = 'none';
    document.getElementById('cart-section').style.display = 'none';
    app.loadProducts();
}

function showCart() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('products-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none';
    document.getElementById('create-product-section').style.display = 'none';
    document.getElementById('cart-section').style.display = 'block';
    
    if (app.user) {
        app.loadCart();
    }
}

function showChat() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('products-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'block';
    document.getElementById('create-product-section').style.display = 'none';
    document.getElementById('cart-section').style.display = 'none';
    
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
    document.getElementById('cart-section').style.display = 'none';
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

// ================== INICIALIZACIÓN ==================

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
    
    .empty-cart {
        text-align: center;
        padding: 3rem;
        color: #666;
        font-size: 1.1rem;
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