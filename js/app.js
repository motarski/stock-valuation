/**
 * Smart Stock Recommender - Simplified App Logic
 * Three Pillars: Fundamentals + Technical + Sentiment
 */

let stockData = null;
let technicalData = null;
let sentimentData = null;
let tradingViewWidget = null;
let autocompleteTimeout = null;
let selectedAutocompleteIndex = -1;
let autocompleteResults = [];

// Fetch market sentiment on page load
window.addEventListener('DOMContentLoaded', () => {
    fetchMarketSentiment();

    // Add Enter key listener to ticker input
    const tickerInput = document.getElementById('tickerSymbol');
    tickerInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            // If dropdown is visible and item is selected, use it
            const dropdown = document.getElementById('autocompleteDropdown');
            if (dropdown.style.display !== 'none' && selectedAutocompleteIndex >= 0) {
                selectAutocompleteItem(autocompleteResults[selectedAutocompleteIndex]);
            } else {
                analyzeStock();
            }
        }
    });

    // Add autocomplete input listener
    tickerInput.addEventListener('input', (event) => {
        handleAutocompleteInput(event.target.value);
    });

    // Add keyboard navigation for autocomplete
    tickerInput.addEventListener('keydown', (event) => {
        const dropdown = document.getElementById('autocompleteDropdown');
        if (dropdown.style.display === 'none') return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            selectedAutocompleteIndex = Math.min(selectedAutocompleteIndex + 1, autocompleteResults.length - 1);
            highlightAutocompleteItem();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            selectedAutocompleteIndex = Math.max(selectedAutocompleteIndex - 1, -1);
            highlightAutocompleteItem();
        } else if (event.key === 'Escape') {
            hideAutocomplete();
        }
    });

    // Click outside to close dropdown
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.ticker-input-group')) {
            hideAutocomplete();
        }
    });

    // Add global ESC key listener for resetting to search
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' || event.key === 'Esc') {
            const resultsDiv = document.getElementById('results');
            const errorDiv = document.getElementById('errorResults');

            // If either results or error page is showing, hide them and focus input
            if (resultsDiv.style.display === 'block' || errorDiv.style.display === 'block') {
                hideResults();
                document.getElementById('tickerSymbol').focus();
                // Select all text in input for easy replacement
                document.getElementById('tickerSymbol').select();
            }
        }
    });
});

/**
 * Fetch and display market sentiment (Fear & Greed Index)
 */
async function fetchMarketSentiment() {
    try {
        const url = API_CONFIG.getFearGreedUrl();
        const response = await fetch(url);
        const json = await response.json();

        if (json.success && json.data) {
            sentimentData = json.data;
            displayMarketSentiment(json.data);
        }
    } catch (error) {
        console.error('Error fetching market sentiment:', error);
        document.getElementById('sentimentRating').textContent = 'Unable to load';
        document.getElementById('sentimentScore').textContent = '';
    }
}

/**
 * Display market sentiment
 */
function displayMarketSentiment(data) {
    // Cyberpunk icons instead of emojis
    let icon = '';
    let iconColor = '';

    if (data.rating.includes('Extreme Greed')) {
        icon = '<i class="fa-solid fa-rocket"></i>';
        iconColor = '#00ff87';
    } else if (data.rating.includes('Greed')) {
        icon = '<i class="fa-solid fa-arrow-trend-up"></i>';
        iconColor = '#00ff87';
    } else if (data.rating.includes('Neutral')) {
        icon = '<i class="fa-solid fa-equals"></i>';
        iconColor = '#ffaa00';
    } else if (data.rating.includes('Extreme Fear')) {
        icon = '<i class="fa-solid fa-skull-crossbones"></i>';
        iconColor = '#ff4444';
    } else {
        icon = '<i class="fa-solid fa-arrow-trend-down"></i>';
        iconColor = '#ff4444';
    }

    const color = data.rating.includes('Greed') ? '#00ff87' :
                  data.rating.includes('Neutral') ? '#ffaa00' : '#ff4444';

    // Format trend with arrows and clearer labels
    let trendDisplay = '';
    let trendEmoji = '';
    if (data.trend === 'increasing') {
        trendEmoji = '<i class="fa-solid fa-arrow-trend-up"></i>';
        trendDisplay = 'Greed Rising';
    } else if (data.trend === 'decreasing') {
        trendEmoji = '<i class="fa-solid fa-arrow-trend-down"></i>';
        trendDisplay = 'Fear Rising';
    } else {
        trendEmoji = '<i class="fa-solid fa-arrows-left-right"></i>';
        trendDisplay = 'Stable';
    }

    // Update with icon and matching color
    const emojiElement = document.getElementById('sentimentEmoji');
    emojiElement.innerHTML = icon;
    emojiElement.style.color = iconColor;
    emojiElement.style.filter = `drop-shadow(0 0 20px ${iconColor})`;

    document.getElementById('sentimentRating').textContent = data.rating;
    document.getElementById('sentimentRating').style.color = color;
    document.getElementById('sentimentScore').textContent = `Score: ${data.score}/100 • VIX: ${data.vix.toFixed(2)}`;
    document.getElementById('sentimentSource').innerHTML = `
        <span>${data.source}</span>
        <span style="opacity: 0.4;">|</span>
        <span>${trendEmoji} ${trendDisplay}</span>
    `;
}

/**
 * Initialize TradingView Chart with Cyberpunk Theme
 */
function initTradingViewChart(ticker, exchange = '') {
    // Destroy existing widget if present
    if (tradingViewWidget) {
        try {
            tradingViewWidget.remove();
        } catch (e) {
            // Ignore errors during removal
        }
    }

    // Clear the container
    const container = document.getElementById('tradingview_chart');
    container.innerHTML = '';

    // Map common exchanges to TradingView format
    const exchangeMap = {
        // Nordic exchanges
        'ST': 'OMXSTO',       // Stockholm
        'STO': 'OMXSTO',      // Stockholm alternative
        'HE': 'OMXHEX',       // Helsinki
        'CO': 'OMXCOP',       // Copenhagen

        // European exchanges
        'DE': 'XETRA',        // Germany
        'F': 'FSE',           // Frankfurt
        'L': 'LSE',           // London
        'PA': 'EURONEXT',     // Paris
        'AS': 'EURONEXT',     // Amsterdam

        // US exchanges (from yfinance API)
        'NYQ': 'NYSE',        // NYSE
        'NMS': 'NASDAQ',      // NASDAQ
        'NGM': 'NASDAQ',      // NASDAQ Global Market
        'NAS': 'NASDAQ',      // NASDAQ alternative
        'PCX': 'ARCA',        // NYSE Arca
        'ASE': 'AMEX',        // American Stock Exchange

        // Other major exchanges
        'TO': 'TSX',          // Toronto
        'V': 'TSX',           // TSX Venture
        'AX': 'ASX',          // Australian
        'T': 'TSE',           // Tokyo
        'HK': 'HKEX'          // Hong Kong
    };

    // Clean ticker by removing exchange suffix if present
    const cleanTicker = ticker.replace(/\.[A-Z]+$/, '');

    // Determine symbol format for TradingView
    let symbol;
    if (exchange && exchangeMap[exchange]) {
        // Use mapped exchange
        symbol = `${exchangeMap[exchange]}:${cleanTicker}`;
    } else if (exchange) {
        // Use exchange as-is if not in map
        symbol = `${exchange}:${cleanTicker}`;
    } else {
        // No exchange provided - just use ticker and let TradingView figure it out
        symbol = cleanTicker;
    }

    console.log(`TradingView Chart - Ticker: ${ticker}, Exchange: ${exchange}, Symbol: ${symbol}`);

    // Create new widget with cyberpunk theme
    tradingViewWidget = new TradingView.widget({
        "autosize": true,
        "symbol": symbol,
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#0a0a14",
        "enable_publishing": false,
        "backgroundColor": "#0d0d1a",
        "gridColor": "rgba(0, 255, 255, 0.05)",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "container_id": "tradingview_chart",
        "studies": [
            "MASimple@tv-basicstudies",
            "RSI@tv-basicstudies"
        ],
        "overrides": {
            // Cyberpunk color scheme
            "paneProperties.background": "#0d0d1a",
            "paneProperties.backgroundType": "solid",
            "paneProperties.vertGridProperties.color": "rgba(0, 255, 255, 0.05)",
            "paneProperties.horzGridProperties.color": "rgba(0, 255, 255, 0.05)",
            "symbolWatermarkProperties.transparency": 90,
            "scalesProperties.textColor": "#b8c5db",
            "mainSeriesProperties.candleStyle.upColor": "#00ff88",
            "mainSeriesProperties.candleStyle.downColor": "#ff0055",
            "mainSeriesProperties.candleStyle.borderUpColor": "#00ff88",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ff0055",
            "mainSeriesProperties.candleStyle.wickUpColor": "#00ff88",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ff0055"
        }
    });
}

/**
 * Main function: Analyze stock
 */
async function analyzeStock() {
    const ticker = document.getElementById('tickerSymbol').value.trim().toUpperCase();

    if (!ticker) {
        showError('Please enter a stock ticker symbol');
        return;
    }

    hideMessages();
    showLoading();
    hideResults();

    try {
        const url = API_CONFIG.getStockUrl(ticker);
        const response = await fetch(url);
        const json = await response.json();

        if (!json.success || !json.data) {
            // Check if it's an invalid ticker error
            if (json.error === 'invalid_ticker') {
                hideLoading();
                showFunnyError(ticker);
                return;
            }
            throw new Error('No data found for this ticker');
        }

        stockData = json.data;
        technicalData = json.data.technical;

        // Get exchange from API response or extract from ticker
        let exchange = stockData.exchange || '';

        // If no exchange from API, try to extract from ticker (e.g., KAMBI.ST -> ST)
        if (!exchange) {
            const exchangeMatch = ticker.match(/\.([A-Z]+)$/);
            exchange = exchangeMatch ? exchangeMatch[1] : '';
        }

        console.log(`Ticker: ${ticker}, Exchange from API: ${stockData.exchange}, Final exchange: ${exchange}`);

        // Initialize TradingView chart
        initTradingViewChart(ticker, exchange);

        // Calculate and display results
        displayResults();
        hideLoading();

    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showError(`Unable to fetch data for ${ticker}. ${error.message}`);
    }
}

/**
 * Display all results
 */
function displayResults() {
    const stock = stockData;

    // Update company header
    document.getElementById('companyNameDisplay').textContent = stock.companyName || stock.symbol;
    document.getElementById('companySectorDisplay').textContent = `${stock.sector || 'N/A'} • ${stock.industry || 'N/A'}`;
    document.getElementById('currentPriceDisplay').textContent = formatPrice(stock.currentPrice, stock.currency);
    document.getElementById('priceRangeDisplay').textContent = `52W Range: ${formatPrice(stock.fiftyTwoWeekLow, stock.currency)} - ${formatPrice(stock.fiftyTwoWeekHigh, stock.currency)}`;

    // Display RSI Overbought/Oversold status
    if (technicalData && technicalData.rsi !== null) {
        const rsi = technicalData.rsi;
        let rsiHTML = '';

        if (rsi > 70) {
            rsiHTML = `<div style="display: inline-block; padding: 8px 16px; background: rgba(255,68,68,0.2); border: 2px solid #ff4444; border-radius: 8px; font-weight: bold; color: #ff4444;">
                🔴 OVERBOUGHT (RSI: ${rsi.toFixed(1)})
            </div>`;
        } else if (rsi < 30) {
            rsiHTML = `<div style="display: inline-block; padding: 8px 16px; background: rgba(0,255,135,0.2); border: 2px solid #00ff87; border-radius: 8px; font-weight: bold; color: #00ff87;">
                🟢 OVERSOLD (RSI: ${rsi.toFixed(1)})
            </div>`;
        } else {
            rsiHTML = `<div style="display: inline-block; padding: 8px 16px; background: rgba(255,170,0,0.1); border: 2px solid #ffaa00; border-radius: 8px; font-weight: bold; color: #ffaa00;">
                🟡 NEUTRAL (RSI: ${rsi.toFixed(1)})
            </div>`;
        }

        document.getElementById('rsiStatusDisplay').innerHTML = rsiHTML;
    }

    // Calculate scores
    const scores = calculateScores(stock, technicalData, sentimentData);

    // Display main recommendation
    displayRecommendation(scores, stock);

    // Display three pillars
    displayFundamentals(stock, scores.fundamentals);
    displayTechnical(technicalData, stock.currentPrice, scores.technical);
    displayActionPlan(scores, stock);

    // Show results and scroll to show the entire results section including header
    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';

    // Scroll to results with some padding above to ensure header is visible
    setTimeout(() => {
        const yOffset = -20; // 20px padding above results
        const element = resultsDiv;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }, 100);
}

/**
 * Calculate scores for all three pillars
 */
function calculateScores(stock, technical, sentiment) {
    let fundamentalScore = 0;
    let technicalScore = 0;
    let sentimentScore = 0;

    // FUNDAMENTALS SCORING (0-5)
    const sectorPE = getSectorPE(stock.sector);
    if (stock.peRatio && sectorPE) {
        if (stock.peRatio < sectorPE * 0.7) fundamentalScore += 2;
        else if (stock.peRatio < sectorPE) fundamentalScore += 1;
        else if (stock.peRatio > sectorPE * 1.5) fundamentalScore -= 1;
    }

    // Price vs 52-week range
    if (stock.currentPrice && stock.fiftyTwoWeekHigh && stock.fiftyTwoWeekLow) {
        const range = stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow;
        const position = (stock.currentPrice - stock.fiftyTwoWeekLow) / range;
        if (position < 0.3) fundamentalScore += 2; // Near 52W low
        else if (position < 0.5) fundamentalScore += 1;
        else if (position > 0.9) fundamentalScore -= 1; // Near 52W high
    }

    // Growth
    if (stock.revenueGrowth && stock.revenueGrowth > 0.15) fundamentalScore += 1;
    if (stock.earningsGrowth && stock.earningsGrowth > 0.10) fundamentalScore += 1;

    // TECHNICAL SCORING (0-5)
    if (technical) {
        // RSI
        if (technical.rsi !== null) {
            if (technical.rsi < 30) technicalScore += 2;
            else if (technical.rsi > 70) technicalScore -= 2;
        }

        // MACD
        if (technical.macd !== null && technical.macd_signal !== null) {
            if (technical.macd > technical.macd_signal) technicalScore += 1;
            else technicalScore -= 1;
        }

        // Moving Averages
        if (technical.sma50 !== null && technical.sma200 !== null) {
            if (technical.sma50 > technical.sma200) technicalScore += 1;
            else technicalScore -= 1;
        }

        // Price vs SMA
        if (technical.sma50 !== null && stock.currentPrice > technical.sma50) technicalScore += 1;
    }

    // SENTIMENT SCORING (0-5)
    if (sentiment) {
        if (sentiment.score > 70) sentimentScore = 5; // Extreme greed - risky
        else if (sentiment.score > 60) sentimentScore = 4;
        else if (sentiment.score > 40) sentimentScore = 3;
        else if (sentiment.score > 25) sentimentScore = 2; // Fear - opportunity
        else sentimentScore = 1; // Extreme fear - big opportunity
    }

    // Normalize to 0-5 scale
    fundamentalScore = Math.max(0, Math.min(5, fundamentalScore));
    technicalScore = Math.max(0, Math.min(5, technicalScore + 2)); // Offset to 0-5
    sentimentScore = Math.max(0, Math.min(5, sentimentScore));

    const totalScore = fundamentalScore + technicalScore + sentimentScore;

    return {
        fundamentals: fundamentalScore,
        technical: technicalScore,
        sentiment: sentimentScore,
        total: totalScore,
        maxTotal: 15
    };
}

/**
 * Display main recommendation card
 */
function displayRecommendation(scores, stock) {
    const card = document.getElementById('recommendationCard');
    const percentage = (scores.total / scores.maxTotal) * 100;

    let recommendation = '';
    let emoji = '';
    let color = '';
    let bgGradient = '';

    if (percentage >= 70) {
        recommendation = 'STRONG BUY';
        emoji = '<i class="fa-solid fa-bullseye"></i>';
        color = '#00ff87';
        bgGradient = 'linear-gradient(135deg, rgba(0, 255, 135, 0.2), rgba(0, 200, 100, 0.1))';
    } else if (percentage >= 55) {
        recommendation = 'BUY';
        emoji = '<i class="fa-solid fa-circle-check"></i>';
        color = '#00ff87';
        bgGradient = 'linear-gradient(135deg, rgba(0, 255, 135, 0.15), rgba(0, 200, 100, 0.05))';
    } else if (percentage >= 40) {
        recommendation = 'HOLD';
        emoji = '<i class="fa-solid fa-pause"></i>';
        color = '#ffaa00';
        bgGradient = 'linear-gradient(135deg, rgba(255, 170, 0, 0.15), rgba(255, 140, 0, 0.05))';
    } else if (percentage >= 25) {
        recommendation = 'SELL';
        emoji = '<i class="fa-solid fa-triangle-exclamation"></i>';
        color = '#ff4444';
        bgGradient = 'linear-gradient(135deg, rgba(255, 68, 68, 0.15), rgba(255, 50, 50, 0.05))';
    } else {
        recommendation = 'STRONG SELL';
        emoji = '<i class="fa-solid fa-circle-xmark"></i>';
        color = '#ff4444';
        bgGradient = 'linear-gradient(135deg, rgba(255, 68, 68, 0.2), rgba(255, 50, 50, 0.1))';
    }

    card.innerHTML = `
        <div style="background: ${bgGradient}; padding: 30px; border-radius: 12px; border-left: 4px solid ${color};">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                <div>
                    <div style="font-size: 1.2em; opacity: 0.8; margin-bottom: 5px;">Recommendation</div>
                    <div style="font-size: 3em; font-weight: bold; color: ${color};">${emoji} ${recommendation}</div>
                    <div style="margin-top: 10px; font-size: 1.1em;">
                        Overall Score: <strong>${scores.total}/${scores.maxTotal}</strong> (${percentage.toFixed(0)}%)
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.9em; opacity: 0.7; margin-bottom: 15px;">Score Breakdown</div>
                    <div style="display: flex; gap: 15px;">
                        <div style="text-align: center;">
                            <div style="font-size: 2em; font-weight: bold;">${scores.fundamentals}</div>
                            <div style="font-size: 0.8em; opacity: 0.7;">Fundamentals</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 2em; font-weight: bold;">${scores.technical}</div>
                            <div style="font-size: 0.8em; opacity: 0.7;">Technical</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 2em; font-weight: bold;">${scores.sentiment}</div>
                            <div style="font-size: 0.8em; opacity: 0.7;">Sentiment</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Display fundamentals pillar
 */
function displayFundamentals(stock, score) {
    const card = document.getElementById('fundamentalsCard');
    const stars = '⭐'.repeat(score) + '☆'.repeat(5 - score);

    const sectorPE = getSectorPE(stock.sector);
    const peStatus = stock.peRatio && sectorPE ?
        (stock.peRatio < sectorPE ? '🟢 Below sector avg' : '🔴 Above sector avg') : 'N/A';

    const range = stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow;
    const position = ((stock.currentPrice - stock.fiftyTwoWeekLow) / range * 100).toFixed(0);

    card.innerHTML = `
        <h3><i class="fa-solid fa-chart-pie"></i> Fundamentals ${stars}</h3>
        <div style="margin-top: 15px;">
            <div style="margin-bottom: 10px;">
                <strong>P/E Ratio:</strong> ${stock.peRatio?.toFixed(2) || 'N/A'} ${peStatus}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>52W Position:</strong> ${position}% of range
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Revenue Growth:</strong> ${stock.revenueGrowth ? (stock.revenueGrowth * 100).toFixed(1) + '%' : 'N/A'}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Market Cap:</strong> ${formatLargeNumber(stock.marketCap)}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Beta:</strong> ${stock.beta?.toFixed(2) || 'N/A'}
            </div>
        </div>
    `;
}

/**
 * Display technical analysis pillar
 */
function displayTechnical(technical, currentPrice, score) {
    const card = document.getElementById('technicalCard');
    const stars = '⭐'.repeat(score) + '☆'.repeat(5 - score);

    if (!technical) {
        card.innerHTML = '<h3><i class="fa-solid fa-chart-line"></i> Technical Analysis</h3><p>No technical data available</p>';
        return;
    }

    const rsiColor = technical.rsi > 70 ? '#ff4444' : technical.rsi < 30 ? '#00ff87' : '#ffaa00';
    const macdSignal = technical.macd > technical.macd_signal ? '<i class="fa-solid fa-circle" style="color: #00ff87;"></i> Bullish' : '<i class="fa-solid fa-circle" style="color: #ff4444;"></i> Bearish';
    const trendSignal = currentPrice > technical.sma50 && currentPrice > technical.sma200 ? '<i class="fa-solid fa-circle" style="color: #00ff87;"></i> Uptrend' : '<i class="fa-solid fa-circle" style="color: #ff4444;"></i> Downtrend';
    const currency = stockData.currency || 'USD';

    card.innerHTML = `
        <h3><i class="fa-solid fa-chart-line"></i> Technical Analysis ${stars}</h3>
        <div style="margin-top: 15px;">
            <div style="margin-bottom: 10px;">
                <strong>RSI (14):</strong> <span style="color: ${rsiColor}; font-weight: bold;">${technical.rsi?.toFixed(2) || 'N/A'}</span>
            </div>
            <div style="margin-bottom: 10px;">
                <strong>MACD:</strong> ${macdSignal}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Trend:</strong> ${trendSignal}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>SMA 50:</strong> ${formatPrice(technical.sma50, currency)}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>SMA 200:</strong> ${formatPrice(technical.sma200, currency)}
            </div>
        </div>
    `;
}

/**
 * Display action plan with Elliott Wave-based entry
 */
function displayActionPlan(scores, stock) {
    const card = document.getElementById('actionCard');
    const percentage = (scores.total / scores.maxTotal) * 100;
    const tech = technicalData;
    const currency = stock.currency || 'USD';

    let actionText = '';
    let entryPrice = '';
    let stopLoss = '';
    let target = '';
    let waveInfo = '';

    // Use Elliott Wave data if available
    const hasWaveData = tech && tech.entry_level && tech.support_level && tech.resistance_level;

    if (percentage >= 60) {
        actionText = '<i class="fa-solid fa-coins"></i> Consider buying on dips';

        if (hasWaveData) {
            // Check if entry level is at or near current price (within 2%)
            const entryDiff = Math.abs(tech.entry_level - stock.currentPrice) / stock.currentPrice;

            if (entryDiff < 0.02) {
                // Entry is at current price - buy now
                entryPrice = `Buy now at ${formatPrice(tech.entry_level, currency)}`;
            } else if (tech.entry_level > stock.currentPrice) {
                // Entry is above current price - wait for pullback
                entryPrice = `Wait for rally to ${formatPrice(tech.entry_level, currency)}`;
            } else {
                // Entry is below current price - good entry zone
                entryPrice = `Good entry at ${formatPrice(tech.entry_level, currency)} or better`;
            }

            // Stop loss should be BELOW entry price
            stopLoss = formatPrice(tech.entry_level * 0.96, currency);
            target = formatPrice(tech.resistance_level, currency);
            waveInfo = `<div style="margin-top: 10px; padding: 8px; background: rgba(0,255,135,0.1); border-radius: 6px; font-size: 0.9em;">
                <strong><i class="fa-solid fa-chart-line"></i> Wave Pattern:</strong> ${tech.wave_pattern}<br>
                <small>Support: ${formatPrice(tech.support_level, currency)} • Resistance: ${formatPrice(tech.resistance_level, currency)}</small>
            </div>`;
        } else {
            entryPrice = `${formatPrice(stock.currentPrice * 0.98, currency)} - ${formatPrice(stock.currentPrice * 1.02, currency)}`;
            stopLoss = formatPrice(stock.currentPrice * 0.92, currency);
            target = formatPrice(stock.currentPrice * 1.15, currency);
        }

    } else if (percentage >= 40) {
        actionText = '<i class="fa-solid fa-pause"></i> Hold current position or wait';

        if (hasWaveData) {
            // For HOLD recommendation, don't suggest buying even if at entry level
            // Show what the entry would be IF upgrading to BUY
            entryPrice = `Monitor - Optimal entry at ${formatPrice(tech.entry_level, currency)}`;
            stopLoss = `If entering: ${formatPrice(tech.entry_level * 0.96, currency)}`;
            target = `Potential target: ${formatPrice(tech.resistance_level, currency)}`;
            waveInfo = `<div style="margin-top: 10px; padding: 8px; background: rgba(255,170,0,0.1); border-radius: 6px; font-size: 0.9em;">
                <strong><i class="fa-solid fa-chart-pie"></i> Wave Pattern:</strong> ${tech.wave_pattern}<br>
                <small>Wait for fundamentals or sentiment to improve before entering</small>
            </div>`;
        } else {
            entryPrice = `Wait for better entry around ${formatPrice(stock.currentPrice * 0.95, currency)}`;
            stopLoss = formatPrice(stock.currentPrice * 0.92, currency);
            target = formatPrice(stock.currentPrice * 1.08, currency);
        }

    } else {
        actionText = '<i class="fa-solid fa-triangle-exclamation"></i> Avoid or consider selling';

        if (hasWaveData) {
            // For SELL recommendation, show exit strategy not entry strategy
            entryPrice = `Not recommended - Overvalued`;
            stopLoss = `N/A - Consider exiting position`;
            target = `If buying later, wait for ${formatPrice(tech.entry_level, currency)}`;
            waveInfo = `<div style="margin-top: 10px; padding: 8px; background: rgba(255,68,68,0.1); border-radius: 6px; font-size: 0.9em;">
                <strong><i class="fa-solid fa-circle-xmark"></i> Wave Pattern:</strong> ${tech.wave_pattern}<br>
                <small>Stock is overbought - better entry would be near ${formatPrice(tech.entry_level, currency)}</small>
            </div>`;
        } else {
            entryPrice = `Not recommended - Overvalued`;
            stopLoss = `N/A - Consider exiting position`;
            target = `N/A`;
        }
    }

    card.innerHTML = `
        <h3><i class="fa-solid fa-bullseye"></i> Action Plan</h3>
        <div style="margin-top: 15px;">
            <div style="margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <strong>${actionText}</strong>
            </div>
            <div style="margin-bottom: 10px;">
                <strong>${percentage < 40 ? 'Buy Entry:' : 'Entry Price'}:</strong> ${entryPrice}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>${percentage < 40 ? 'Recommendation:' : 'Stop Loss'}:</strong> ${stopLoss}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>${percentage < 40 ? 'Future Entry:' : 'Target'}:</strong> ${target}
            </div>
            ${waveInfo}
        </div>
    `;
}

/**
 * Helper Functions
 */
function getCurrencySymbol(currencyCode) {
    const currencySymbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'SEK': 'kr',
        'NOK': 'kr',
        'DKK': 'kr',
        'CHF': 'CHF',
        'CAD': 'C$',
        'AUD': 'A$',
        'NZD': 'NZ$',
        'HKD': 'HK$',
        'SGD': 'S$',
        'INR': '₹',
        'KRW': '₩',
        'BRL': 'R$',
        'MXN': 'MX$',
        'ZAR': 'R',
        'RUB': '₽',
        'TRY': '₺',
        'PLN': 'zł',
        'THB': '฿',
        'IDR': 'Rp',
        'MYR': 'RM',
        'PHP': '₱',
        'TWD': 'NT$',
        'AED': 'د.إ',
        'SAR': '﷼',
        'ILS': '₪'
    };
    return currencySymbols[currencyCode] || currencyCode + ' ';
}

function formatPrice(price, currencyCode) {
    if (!price) return 'N/A';
    const symbol = getCurrencySymbol(currencyCode || 'USD');
    // For currencies that typically use symbol after (SEK, NOK, DKK)
    if (['SEK', 'NOK', 'DKK'].includes(currencyCode)) {
        return price.toFixed(2) + ' ' + symbol;
    }
    return symbol + price.toFixed(2);
}

function getSectorPE(sector) {
    const sectorPE = {
        'Technology': 30,
        'Consumer Cyclical': 20,
        'Healthcare': 25,
        'Financial Services': 15,
        'Communication Services': 20,
        'Industrials': 18,
        'Energy': 12,
        'Utilities': 16,
        'Real Estate': 25,
        'Basic Materials': 14,
        'Consumer Defensive': 18
    };
    return sectorPE[sector] || 20;
}

function formatLargeNumber(num) {
    if (!num) return 'N/A';
    if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    return '$' + num.toFixed(2);
}

function showLoading() {
    document.getElementById('loadingMessage').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingMessage').classList.remove('active');
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.classList.add('active');
}

function showFunnyError(ticker) {
    const funnyMessages = [
        `Oops! <i class="fa-solid fa-poo"></i> Looks like "${ticker}" made a poo-poo... It doesn't exist!`,
        `404 Stock Not Found! <i class="fa-solid fa-magnifying-glass"></i> "${ticker}" is playing hide and seek... and winning!`,
        `Whoopsie! <i class="fa-solid fa-eye-slash"></i> "${ticker}" took a wrong turn and ended up in the Bermuda Triangle!`,
        `Houston, we have a problem! <i class="fa-solid fa-rocket"></i> "${ticker}" is not in our galaxy!`,
        `Error 404: Stock Not Found! <i class="fa-solid fa-ghost"></i> "${ticker}" ghosted us!`,
        `Nope! <i class="fa-solid fa-ban"></i> "${ticker}" is as real as unicorns and leprechauns!`,
        `Uh oh! <i class="fa-solid fa-skull"></i> "${ticker}" has left the building... permanently!`
    ];

    const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];

    // Hide regular results and show error div
    document.getElementById('results').style.display = 'none';
    const errorDiv = document.getElementById('errorResults');
    errorDiv.innerHTML = `
        <div class="card" style="text-align: center; padding: 60px 40px; background: linear-gradient(135deg, rgba(255, 68, 68, 0.15), rgba(255, 50, 50, 0.05)); border: 2px solid #ff4444;">
            <div style="font-size: 6em; margin-bottom: 20px;"><i class="fa-solid fa-poo" style="color: #ff4444;"></i></div>
            <h1 style="color: #ff4444; margin-bottom: 20px; font-size: 2em;">Oops! Ticker Not Found</h1>
            <p style="font-size: 1.3em; margin-bottom: 30px; line-height: 1.6;">
                ${randomMessage}
            </p>
            <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; margin-bottom: 30px;">
                <p style="font-size: 1.1em; margin-bottom: 15px;">
                    <strong>Pro Tips:</strong>
                </p>
                <ul style="list-style: none; padding: 0; text-align: left; max-width: 500px; margin: 0 auto;">
                    <li style="margin-bottom: 10px;"><i class="fa-solid fa-circle-check" style="color: #00ff88;"></i> Double-check your ticker symbol spelling</li>
                    <li style="margin-bottom: 10px;"><i class="fa-solid fa-circle-check" style="color: #00ff88;"></i> Try searching for the company name on Yahoo Finance</li>
                    <li style="margin-bottom: 10px;"><i class="fa-solid fa-circle-check" style="color: #00ff88;"></i> For international stocks, use the exchange suffix (e.g., KAMBI.ST, VOW3.DE)</li>
                    <li style="margin-bottom: 10px;"><i class="fa-solid fa-circle-check" style="color: #00ff88;"></i> Some tickers might be delisted or merged</li>
                </ul>
            </div>
            <button onclick="closeErrorPage()"
                    style="padding: 15px 40px; font-size: 1.1em; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); border: none; border-radius: 12px; color: white; font-weight: bold; cursor: pointer; font-family: 'Space Mono', monospace;">
                Try Another Ticker
            </button>
            <div style="margin-top: 15px; opacity: 0.6; font-size: 0.9em;">
                Press <kbd style="background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);">ESC</kbd> to close
            </div>
        </div>
    `;
    errorDiv.style.display = 'block';
    errorDiv.scrollIntoView({ behavior: 'smooth' });
}

function closeErrorPage() {
    document.getElementById('errorResults').style.display = 'none';
    document.getElementById('tickerSymbol').focus();
    document.getElementById('tickerSymbol').select();
}

function hideMessages() {
    document.getElementById('errorMessage').classList.remove('active');
}

function hideResults() {
    document.getElementById('results').style.display = 'none';
    document.getElementById('errorResults').style.display = 'none';
}

/**
 * Autocomplete Functions
 */
function handleAutocompleteInput(query) {
    clearTimeout(autocompleteTimeout);

    if (query.length < 2) {
        hideAutocomplete();
        return;
    }

    // Debounce the API call
    autocompleteTimeout = setTimeout(() => {
        fetchAutocompleteResults(query);
    }, 300);
}

async function fetchAutocompleteResults(query) {
    const dropdown = document.getElementById('autocompleteDropdown');

    // Show loading state
    dropdown.innerHTML = '<div class="autocomplete-loading"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</div>';
    dropdown.style.display = 'block';

    try {
        // Use backend API (works in both dev and prod)
        const url = API_CONFIG.getAutocompleteUrl(query);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success && data.quotes && data.quotes.length > 0) {
            autocompleteResults = data.quotes;
            displayAutocompleteResults(data.quotes);
        } else {
            dropdown.innerHTML = '<div class="autocomplete-no-results"><i class="fa-solid fa-circle-xmark"></i> No results found</div>';
        }
    } catch (error) {
        console.error('Autocomplete error:', error);
        dropdown.innerHTML = '<div class="autocomplete-no-results"><i class="fa-solid fa-triangle-exclamation"></i> Search unavailable</div>';
    }
}

function displayAutocompleteResults(results) {
    const dropdown = document.getElementById('autocompleteDropdown');
    selectedAutocompleteIndex = -1;

    dropdown.innerHTML = results.map((result, index) => {
        const symbol = result.symbol || '';
        const name = result.shortname || result.longname || '';
        const exchange = result.exchange || result.exchDisp || '';
        const type = result.quoteType || '';

        return `
            <div class="autocomplete-item" data-index="${index}" onclick="selectAutocompleteItem(autocompleteResults[${index}])">
                <span class="ticker-symbol">${symbol}</span>
                <span class="company-name">${name}</span>
                <span class="exchange-type">${exchange} • ${type}</span>
            </div>
        `;
    }).join('');

    dropdown.style.display = 'block';
}

function selectAutocompleteItem(result) {
    const tickerInput = document.getElementById('tickerSymbol');
    tickerInput.value = result.symbol;
    hideAutocomplete();
    analyzeStock();
}

function highlightAutocompleteItem() {
    const items = document.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
        if (index === selectedAutocompleteIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            item.classList.remove('selected');
        }
    });
}

function hideAutocomplete() {
    const dropdown = document.getElementById('autocompleteDropdown');
    dropdown.style.display = 'none';
    selectedAutocompleteIndex = -1;
    autocompleteResults = [];
}
