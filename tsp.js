class City {
    constructor(x, y, name = '') {
        this.x = x;
        this.y = y;
        this.name = name;
        this.id = Math.random().toString(36).substr(2, 9);
    }
}

class Route {
    constructor(cities) {
        this.cities = cities;
        this.distance = this.calculateDistance();
        this.fitness = 0;
    }

    calculateDistance() {
        let totalDistance = 0;
        for (let i = 0; i < this.cities.length; i++) {
            const city1 = this.cities[i];
            const city2 = this.cities[(i + 1) % this.cities.length];
            totalDistance += this.getDistance(city1, city2);
        }
        return totalDistance;
    }

    getDistance(city1, city2) {
        return Math.sqrt(Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2));
    }

    calculateFitness() {
        this.fitness = 1 / (this.distance + 1);
        return this.fitness;
    }
}

class Population {
    constructor(size) {
        this.size = size;
        this.routes = new Array(size);
        this.totalFitness = 0;
    }

    calculateFitness() {
        this.totalFitness = 0;
        for (const route of this.routes) {
            this.totalFitness += route.calculateFitness();
        }
    }

    getBestRoute() {
        return this.routes.reduce((best, current) => 
            (!best || current.distance < best.distance) ? current : best
        );
    }

    getAverageDistance() {
        return this.routes.reduce((sum, route) => sum + route.distance, 0) / this.size;
    }
}

class TSPSolver {
    constructor(tspCanvasId, oagdCanvasId) {
        this.tspCanvas = document.getElementById(tspCanvasId);
        this.oagdCanvas = document.getElementById(oagdCanvasId);
        this.tspCtx = this.tspCanvas.getContext('2d');
        this.oagdCtx = this.oagdCanvas.getContext('2d');
        
        this.cities = [];
        this.populationSize = 200;
        this.population = null;
        this.bestRoute = null;
        this.generation = 0;
        this.isRunning = false;
        this.startTime = null;
        this.showOAGD = true;
        
        this.mutationRate = 0.015;
        this.eliteSize = 2;
        this.tournamentSize = 5;
        this.crossoverRate = 0.95;
        
        this.animationState = {
            routeProgress: 0,
            cityHighlight: null,
            pulseScale: 1,
            fadeOpacity: 0.3
        };

        this.stats = {
            bestEver: Infinity,
            lastImprovement: 0,
            stagnationCount: 0,
            timeElapsed: 0,
            improvementHistory: []
        };

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.tspCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.tspCanvas.addEventListener('click', (e) => this.handleClick(e));
        
        document.getElementById('startButton').addEventListener('click', () => this.start());
        document.getElementById('stopButton').addEventListener('click', () => this.stop());
        document.getElementById('resetButton').addEventListener('click', () => this.reset());
        document.getElementById('toggleOAGDButton').addEventListener('click', () => this.toggleOAGD());
    }

    resizeCanvas() {
        const container = this.tspCanvas.parentElement;
        const width = container.clientWidth;
        const height = Math.min(window.innerHeight * 0.6, 600);
        
        [this.tspCanvas, this.oagdCanvas].forEach(canvas => {
            canvas.width = width;
            canvas.height = height;
        });
        
        this.draw();
    }

    handleMouseMove(e) {
        const rect = this.tspCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.animationState.cityHighlight = this.findNearestCity(x, y);
        this.animationState.pulseScale = 1;
        
        if (this.animationState.cityHighlight) {
            this.pulseHighlight();
        }
        
        this.draw();
    }

    handleClick(e) {
        const rect = this.tspCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.addCity(x, y);
    }

    findNearestCity(x, y) {
        if (this.cities.length === 0) return null;
        
        let nearest = null;
        let minDist = Infinity;
        
        for (const city of this.cities) {
            const dist = Math.sqrt(Math.pow(city.x - x, 2) + Math.pow(city.y - y, 2));
            if (dist < minDist) {
                minDist = dist;
                nearest = city;
            }
        }
        
        return minDist < 20 ? nearest : null;
    }

    addCity(x, y, name = '') {
        this.cities.push(new City(x, y, name));
        if (this.cities.length >= 3) {
            this.initializePopulation();
        }
        this.draw();
    }

    initializePopulation() {
        this.population = new Population(this.populationSize);
        
        this.initializeHeuristicSolutions();
        
        for (let i = 3; i < this.populationSize; i++) {
            const shuffledCities = [...this.cities].sort(() => Math.random() - 0.5);
            this.population.routes[i] = new Route(shuffledCities);
        }
        
        this.population.calculateFitness();
        this.bestRoute = this.population.getBestRoute();
        this.stats.bestEver = this.bestRoute.distance;
    }

    initializeHeuristicSolutions() {
        this.population.routes[0] = this.getNearestNeighborSolution();
        this.population.routes[1] = this.getGreedySolution();
        this.population.routes[2] = this.getNearestNeighborSolution(
            Math.floor(Math.random() * this.cities.length)
        );
    }

    getNearestNeighborSolution(startIndex = 0) {
        const unvisited = new Set(this.cities);
        const route = [];
        let current = this.cities[startIndex];
        
        route.push(current);
        unvisited.delete(current);

        while (unvisited.size > 0) {
            let nearest = null;
            let minDist = Infinity;
            
            for (const city of unvisited) {
                const dist = Math.sqrt(
                    Math.pow(city.x - current.x, 2) + 
                    Math.pow(city.y - current.y, 2)
                );
                if (dist < minDist) {
                    minDist = dist;
                    nearest = city;
                }
            }
            
            route.push(nearest);
            unvisited.delete(nearest);
            current = nearest;
        }

        return new Route(route);
    }

    getGreedySolution() {
        const edges = [];
        
        for (let i = 0; i < this.cities.length; i++) {
            for (let j = i + 1; j < this.cities.length; j++) {
                const dist = Math.sqrt(
                    Math.pow(this.cities[j].x - this.cities[i].x, 2) + 
                    Math.pow(this.cities[j].y - this.cities[i].y, 2)
                );
                edges.push({from: i, to: j, distance: dist});
            }
        }
        
        edges.sort((a, b) => a.distance - b.distance);
        
        const route = [];
        const visited = new Set();
        const connections = new Map();
        
        for (const edge of edges) {
            if (route.length === this.cities.length) break;
            
            if (!this.wouldCreateCycle(edge, connections) && 
                this.canAddEdge(edge, connections)) {
                route.push(this.cities[edge.from]);
                visited.add(edge.from);
                visited.add(edge.to);
                this.addConnection(edge, connections);
            }
        }
        
        return new Route(route);
    }

    wouldCreateCycle(edge, connections) {
        if (!connections.has(edge.from) && !connections.has(edge.to)) return false;
        
        const visited = new Set();
        const stack = [edge.from];
        
        while (stack.length > 0) {
            const current = stack.pop();
            if (visited.has(current)) continue;
            
            visited.add(current);
            const neighbors = connections.get(current) || [];
            
            for (const neighbor of neighbors) {
                if (neighbor === edge.to) return true;
                stack.push(neighbor);
            }
        }
        
        return false;
    }

    canAddEdge(edge, connections) {
        const fromConnections = connections.get(edge.from) || [];
        const toConnections = connections.get(edge.to) || [];
        return fromConnections.length < 2 && toConnections.length < 2;
    }

    addConnection(edge, connections) {
        if (!connections.has(edge.from)) connections.set(edge.from, []);
        if (!connections.has(edge.to)) connections.set(edge.to, []);
        
        connections.get(edge.from).push(edge.to);
        connections.get(edge.to).push(edge.from);
    }

    tournamentSelection() {
        let best = null;
        for (let i = 0; i < this.tournamentSize; i++) {
            const randomIndex = Math.floor(Math.random() * this.populationSize);
            const candidate = this.population.routes[randomIndex];
            if (!best || candidate.fitness > best.fitness) {
                best = candidate;
            }
        }
        return best;
    }

    crossover(parent1, parent2) {
        if (Math.random() > this.crossoverRate) {
            return new Route([...parent1.cities]);
        }

        const start = Math.floor(Math.random() * this.cities.length);
        const end = Math.floor(Math.random() * this.cities.length);
        const [startPos, endPos] = [Math.min(start, end), Math.max(start, end)];
        
        const childCities = new Array(this.cities.length).fill(null);
        const parent1Slice = parent1.cities.slice(startPos, endPos);
        
        for (let i = startPos; i < endPos; i++) {
            childCities[i] = parent1.cities[i];
        }
        
        let parent2Index = 0;
        for (let i = 0; i < this.cities.length; i++) {
            if (i >= startPos && i < endPos) continue;
            
            while (parent1Slice.includes(parent2.cities[parent2Index])) {
                parent2Index++;
            }
            childCities[i] = parent2.cities[parent2Index];
            parent2Index++;
        }
        
        return new Route(childCities);
    }

    mutate(route) {
        const adaptiveMutationRate = this.calculateAdaptiveMutationRate();
        
        if (Math.random() < 0.5) {
            for (let i = 0; i < route.cities.length; i++) {
                if (Math.random() < adaptiveMutationRate) {
                    const j = Math.floor(Math.random() * route.cities.length);
                    [route.cities[i], route.cities[j]] = [route.cities[j], route.cities[i]];
                }
            }
        } else {
            if (Math.random() < adaptiveMutationRate) {
                const start = Math.floor(Math.random() * route.cities.length);
                const end = Math.floor(Math.random() * route.cities.length);
                const [startPos, endPos] = [Math.min(start, end), Math.max(start, end)];
                
                const segment = route.cities.slice(startPos, endPos).reverse();
                for (let i = startPos; i < endPos; i++) {
                    route.cities[i] = segment[i - startPos];
                }
            }
        }
        
        route.distance = route.calculateDistance();
        route.calculateFitness();
    }

    calculateAdaptiveMutationRate() {
        const baseRate = this.mutationRate;
        const stagnationFactor = Math.min(this.stats.stagnationCount / 100, 2);
        return baseRate * (1 + stagnationFactor);
    }

    animate() {
        if (!this.isRunning) return;
        
        // Update stats before evolution
        this.updateStats();
        
        // Perform evolution
        this.evolve();
        
        // Draw the current state
        this.draw();
        
        // Schedule next frame
        requestAnimationFrame(() => this.animate());
    }

    updateStats() {
        // Update time elapsed
        if (this.startTime) {
            this.stats.timeElapsed = Date.now() - this.startTime;
        }
        
        // Get DOM elements
        const generationCount = document.getElementById('generationCount');
        const bestDistance = document.getElementById('bestDistance');
        const averageDistance = document.getElementById('averageDistance');
        const elapsedTime = document.getElementById('elapsedTime');

        // Update generation count
        if (generationCount) {
            generationCount.textContent = this.generation;
        }
        
        // Update best distance
        if (bestDistance) {
            if (this.bestRoute) {
                bestDistance.textContent = this.bestRoute.distance.toFixed(2);
            } else {
                bestDistance.textContent = '0.00';
            }
        }
        
        // Update average distance
        if (averageDistance) {
            if (this.population) {
                const avg = this.population.getAverageDistance();
                averageDistance.textContent = avg.toFixed(2);
            } else {
                averageDistance.textContent = '0.00';
            }
        }
        
        // Update elapsed time
        if (elapsedTime) {
            const seconds = (this.stats.timeElapsed / 1000).toFixed(1);
            elapsedTime.textContent = `${seconds}s`;
        }
    }

    evolve() {
        if (!this.population) return;
        
        const newPopulation = new Population(this.populationSize);
        
        // Keep elite individuals
        for (let i = 0; i < this.eliteSize; i++) {
            newPopulation.routes[i] = this.population.routes[i];
        }
        
        // Create new individuals
        for (let i = this.eliteSize; i < this.populationSize; i++) {
            const parent1 = this.tournamentSelection();
            const parent2 = this.tournamentSelection();
            const child = this.crossover(parent1, parent2);
            this.mutate(child);
            newPopulation.routes[i] = child;
        }
        
        // Calculate fitness for new population
        newPopulation.calculateFitness();
        
        // Update best route
        const currentBest = newPopulation.getBestRoute();
        if (!this.bestRoute || currentBest.distance < this.bestRoute.distance) {
            this.bestRoute = currentBest;
            this.stats.bestEver = currentBest.distance;
        }
        
        // Update population and generation
        this.population = newPopulation;
        this.generation++;
    }

    start() {
        if (this.cities.length < 3) {
            alert('Please add at least 3 cities');
            return;
        }
        
        if (!this.isRunning) {
            this.isRunning = true;
            this.startTime = Date.now();
            this.animationState.routeProgress = 0;
            
            // Initialize population if not already done
            if (!this.population) {
                this.initializePopulation();
            }
            
            this.animate();
        }
    }

    stop() {
        this.isRunning = false;
    }

    reset() {
        this.stop();
        this.cities = [];
        this.population = null;
        this.bestRoute = null;
        this.generation = 0;
        this.stats = {
            bestEver: Infinity,
            lastImprovement: 0,
            stagnationCount: 0,
            timeElapsed: 0,
            improvementHistory: []
        };
        this.updateStats(); // Update stats after reset
        this.draw();
    }

    toggleOAGD() {
        this.showOAGD = !this.showOAGD;
        this.draw();
    }

    draw() {
        this.clearCanvas();
        this.drawGrid();
        this.drawCities();
        if (this.bestRoute) {
            this.drawRoute();
        }
        this.drawStats();
        
        if (this.showOAGD) {
            this.drawOAGD();
        }
    }

    clearCanvas() {
        this.tspCtx.clearRect(0, 0, this.tspCanvas.width, this.tspCanvas.height);
    }

    drawGrid() {
        const gridSize = 20;
        this.tspCtx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
        this.tspCtx.lineWidth = 1;

        for (let x = 0; x <= this.tspCanvas.width; x += gridSize) {
            this.tspCtx.beginPath();
            this.tspCtx.moveTo(x, 0);
            this.tspCtx.lineTo(x, this.tspCanvas.height);
            this.tspCtx.stroke();
        }

        for (let y = 0; y <= this.tspCanvas.height; y += gridSize) {
            this.tspCtx.beginPath();
            this.tspCtx.moveTo(0, y);
            this.tspCtx.lineTo(this.tspCanvas.width, y);
            this.tspCtx.stroke();
        }
    }

    drawCities() {
        this.cities.forEach((city, index) => {
            this.tspCtx.beginPath();
            this.tspCtx.arc(city.x, city.y, 6, 0, Math.PI * 2);
            
            const gradient = this.tspCtx.createRadialGradient(
                city.x, city.y, 0,
                city.x, city.y, 6
            );
            gradient.addColorStop(0, '#4CAF50');
            gradient.addColorStop(1, '#2196F3');
            
            this.tspCtx.fillStyle = gradient;
            this.tspCtx.fill();
            
            this.tspCtx.fillStyle = '#333';
            this.tspCtx.font = '12px Arial';
            this.tspCtx.fillText(`City ${index + 1}`, city.x + 10, city.y + 10);
            
            if (city === this.animationState.cityHighlight) {
                this.tspCtx.beginPath();
                this.tspCtx.arc(city.x, city.y, 
                    8 * this.animationState.pulseScale, 0, Math.PI * 2);
                this.tspCtx.strokeStyle = 'rgba(255, 152, 0, 0.5)';
                this.tspCtx.stroke();
            }
        });
    }

    drawRoute() {
        if (!this.bestRoute) return;

        this.tspCtx.beginPath();
        this.tspCtx.strokeStyle = '#4CAF50';
        this.tspCtx.lineWidth = 2;
        
        const cities = this.bestRoute.cities;
        this.tspCtx.moveTo(cities[0].x, cities[0].y);
        
        for (let i = 1; i < cities.length; i++) {
            const progress = i / cities.length;
            if (progress <= this.animationState.routeProgress) {
                this.tspCtx.lineTo(cities[i].x, cities[i].y);
            }
        }
        
        if (this.animationState.routeProgress === 1) {
            this.tspCtx.lineTo(cities[0].x, cities[0].y);
        }
        
        this.tspCtx.stroke();
        
        this.animationState.routeProgress += 0.02;
        if (this.animationState.routeProgress > 1) {
            this.animationState.routeProgress = 1;
        }
    }

    drawStats() {
        // Create semi-transparent background for stats
        const padding = 20;
        const margin = 10;
        const lineHeight = 20;
        const fontSize = 14;
        
        // Calculate stats box dimensions
        const stats = [
            `Generation: ${this.generation}`,
            `Best Distance: ${this.bestRoute ? this.bestRoute.distance.toFixed(2) : 'N/A'}`,
            `Cities: ${this.cities.length}`,
            `Population Size: ${this.populationSize}`,
            `Mutation Rate: ${(this.calculateAdaptiveMutationRate() * 100).toFixed(1)}%`,
            `Stagnation Count: ${this.stats.stagnationCount}`,
            `Time Elapsed: ${(this.stats.timeElapsed / 1000).toFixed(1)}s`
        ];
        
        const boxWidth = 250;
        const boxHeight = (stats.length + 1) * lineHeight + 2 * padding;
        
        // Position the stats box in the center-right
        const boxX = this.tspCanvas.width - boxWidth - margin;
        const boxY = margin;
        
        // Draw semi-transparent background
        this.tspCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.tspCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.tspCtx.lineWidth = 1;
        this.tspCtx.beginPath();
        this.tspCtx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
        this.tspCtx.fill();
        this.tspCtx.stroke();
        
        // Draw stats title
        this.tspCtx.font = 'bold ${fontSize}px Arial';
        this.tspCtx.fillStyle = '#333';
        this.tspCtx.fillText('Solver Statistics', boxX + padding, boxY + lineHeight);
        
        // Draw stats
        this.tspCtx.font = `${fontSize}px Arial`;
        stats.forEach((stat, i) => {
            this.tspCtx.fillText(
                stat,
                boxX + padding,
                boxY + (i + 2) * lineHeight
            );
        });
    }

    pulseHighlight() {
        const pulseSpeed = 0.1;
        this.animationState.pulseScale += pulseSpeed;
        if (this.animationState.pulseScale > 1.5) {
            this.animationState.pulseScale = 1;
        }
    }

    drawOAGD() {
        if (this.cities.length === 0) return;
        
        // Center the visualization
        const centerX = this.oagdCanvas.width / 2;
        const centerY = this.oagdCanvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.6; // Slightly smaller radius
        
        this.oagdCtx.clearRect(0, 0, this.oagdCanvas.width, this.oagdCanvas.height);
        
        // Draw title
        this.oagdCtx.font = 'bold 16px Arial';
        this.oagdCtx.fillStyle = '#333';
        this.oagdCtx.textAlign = 'center';
        this.oagdCtx.fillText('Ordered Adjacency Graph Drawing (OAGD)', centerX, 30);
        
        // Draw explanation
        this.oagdCtx.font = '14px Arial';
        this.oagdCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        const explanation = [
            'Cities are arranged in a circle based on their order in the best route.',
            'Lines show possible connections between cities.',
            'Thicker, darker lines indicate shorter distances.',
            'Current best route is highlighted in orange.'
        ];
        
        explanation.forEach((line, i) => {
            this.oagdCtx.fillText(line, centerX, this.oagdCanvas.height - 80 + i * 20);
        });
        
        // Draw connections between cities
        this.cities.forEach((city1, i) => {
            this.cities.forEach((city2, j) => {
                if (i < j) {
                    const angle1 = (i / this.cities.length) * Math.PI * 2;
                    const angle2 = (j / this.cities.length) * Math.PI * 2;
                    
                    const x1 = centerX + Math.cos(angle1) * radius;
                    const y1 = centerY + Math.sin(angle1) * radius;
                    const x2 = centerX + Math.cos(angle2) * radius;
                    const y2 = centerY + Math.sin(angle2) * radius;
                    
                    // Calculate line thickness based on distance
                    const distance = Math.sqrt(
                        Math.pow(city2.x - city1.x, 2) + Math.pow(city2.y - city1.y, 2)
                    );
                    const maxDistance = Math.sqrt(
                        Math.pow(this.oagdCanvas.width, 2) + 
                        Math.pow(this.oagdCanvas.height, 2)
                    );
                    const thickness = 3 * (1 - distance / maxDistance);
                    
                    this.oagdCtx.beginPath();
                    this.oagdCtx.moveTo(x1, y1);
                    this.oagdCtx.lineTo(x2, y2);
                    this.oagdCtx.strokeStyle = `rgba(200, 200, 200, ${1 - distance / maxDistance})`;
                    this.oagdCtx.lineWidth = thickness;
                    this.oagdCtx.stroke();
                }
            });
        });
        
        // Draw the best route if available
        if (this.bestRoute) {
            this.oagdCtx.beginPath();
            const cities = this.bestRoute.cities;
            for (let i = 0; i < cities.length; i++) {
                const cityIndex = this.cities.indexOf(cities[i]);
                const nextCityIndex = this.cities.indexOf(cities[(i + 1) % cities.length]);
                
                const angle1 = (cityIndex / this.cities.length) * Math.PI * 2;
                const angle2 = (nextCityIndex / this.cities.length) * Math.PI * 2;
                
                const x1 = centerX + Math.cos(angle1) * radius;
                const y1 = centerY + Math.sin(angle1) * radius;
                const x2 = centerX + Math.cos(angle2) * radius;
                const y2 = centerY + Math.sin(angle2) * radius;
                
                if (i === 0) {
                    this.oagdCtx.moveTo(x1, y1);
                }
                this.oagdCtx.lineTo(x2, y2);
            }
            this.oagdCtx.strokeStyle = 'rgba(255, 152, 0, 0.8)';
            this.oagdCtx.lineWidth = 3;
            this.oagdCtx.stroke();
        }
        
        // Draw city points and labels
        this.cities.forEach((city, index) => {
            const angle = (index / this.cities.length) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            // Draw point with gradient
            const gradient = this.oagdCtx.createRadialGradient(x, y, 0, x, y, 8);
            gradient.addColorStop(0, '#4CAF50');
            gradient.addColorStop(1, '#2196F3');
            
            this.oagdCtx.beginPath();
            this.oagdCtx.arc(x, y, 8, 0, Math.PI * 2);
            this.oagdCtx.fillStyle = gradient;
            this.oagdCtx.fill();
            
            // Draw city label
            this.oagdCtx.fillStyle = '#333';
            this.oagdCtx.font = '12px Arial';
            this.oagdCtx.textAlign = 'center';
            this.oagdCtx.fillText(`City ${index + 1}`, x, y - 15);
        });
    }
}