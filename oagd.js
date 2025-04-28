class OAGDVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.route = null;
        this.isVisible = false;
        
        // Initialize canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.draw();
    }

    setRoute(route) {
        this.route = route;
        this.draw();
    }

    toggleVisibility() {
        this.isVisible = !this.isVisible;
        this.draw();
    }

    draw() {
        if (!this.isVisible || !this.route) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;
        
        // Draw circular layout
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#666666';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Calculate positions for cities in circular layout
        const cityPositions = this.route.cities.map((city, index) => {
            const angle = (index / this.route.cities.length) * Math.PI * 2;
            return {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
                originalCity: city
            };
        });

        // Draw OAGD connections
        this.ctx.strokeStyle = '#ff8800';
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < cityPositions.length; i++) {
            const current = cityPositions[i];
            const next = cityPositions[(i + 1) % cityPositions.length];
            
            this.ctx.beginPath();
            this.ctx.moveTo(current.x, current.y);
            this.ctx.lineTo(next.x, next.y);
            this.ctx.stroke();
        }

        // Draw city points in OAGD layout
        cityPositions.forEach(pos => {
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ff8800';
            this.ctx.fill();
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
    }
}