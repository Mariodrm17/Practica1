class ProductPortal {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = null;
        this.socket = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
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
    }

    async login() {
        const form = document.getElementById('login-form');
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: form.elements[0].value,
                    password: form.elements[1].value
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('token', this.token);
                this.showAuthenticatedUI();
                this.connectToChat();
                alert('Login exitoso!');
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error en login:', error);
            alert('Error en el servidor');
        }
    }

    async register() {
        const form = document.getElementById('register-form');
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: form.elements[0].value,
                    email: form.elements[1].value,
                    password: form.elements[2].value
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Registro exitoso! Por favor inicia sesión.');
                showLogin();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error en registro:', error);
            alert('Error en el servidor');
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
    }

    showAuthenticatedUI() {
        document.getElementById('auth-buttons').style.display = 'none';
        document.getElementById('user-menu').style.display = 'block';
        document.getElementById('username-display').textContent = `Hola, ${this.user.username} (${this.user.role})`;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('register-section').style.display = 'none';

        // Mostrar panel de admin si es administrador
        if (this.user.role === 'admin') {
            document.getElementById('admin-panel').style.display = 'block';
        }

        this.loadProducts();
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            const products = await response.json();
            
            const productsList = document.getElementById('products-list');
            productsList.innerHTML = '';

            products.forEach(product => {
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                productCard.innerHTML = `
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <div class="price">$${product.price}</div>
                    <div>Categoría: ${product.category}</div>
                    <div>Stock: ${product.stock}</div>
                    ${this.user.role === 'admin' ? `
                        <div class="admin-actions">
                            <button onclick="editProduct('${product._id}')">Editar</button>
                            <button class="delete-btn" onclick="deleteProduct('${product._id}')">Eliminar</button>
                        </div>
                    ` : ''}
                `;
                productsList.appendChild(productCard);
            });
        } catch (error) {
            console.error('Error cargando productos:', error);
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
            this.displaySystemMessage(`${user.username} se unió al chat`);
        });
    }

    sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();

        if (message && this.socket) {
            this.socket.emit('sendMessage', {
                username: this.user.username,
                message: message,
                timestamp: new Date().toLocaleTimeString()
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
            <small>${data.timestamp}</small>
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
}

// Funciones globales para los botones
function showLogin() {
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('products-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none';
}

function showRegister() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'block';
    document.getElementById('products-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none';
}

function showProducts() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('products-section').style.display = 'block';
    document.getElementById('chat-section').style.display = 'none';
    app.loadProducts();
}

function showChat() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('products-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'block';
}

function logout() {
    app.logout();
}

function showCreateProduct() {
    // Implementar creación de producto
    alert('Funcionalidad de crear producto - Por implementar');
}

function editProduct(productId) {
    // Implementar edición de producto
    alert(`Editar producto ${productId} - Por implementar`);
}

function deleteProduct(productId) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
        fetch(`/api/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${app.token}`
            }
        })
        .then(response => {
            if (response.ok) {
                alert('Producto eliminado');
                app.loadProducts();
            } else {
                alert('Error eliminando producto');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error eliminando producto');
        });
    }
}

// Inicializar la aplicación
const app = new ProductPortal();