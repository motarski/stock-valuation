/**
 * Smart Stock Recommender - Simplified App Logic
 * Three Pillars: Fundamentals + Technical + Sentiment
 */

let stockData = null;
let technicalData = null;
let sentimentData = null;

// Fetch market sentiment on page load
window.addEventListener('DOMContentLoaded', () => {
    fetchMarketSentiment();
});

/**
 * Fetch and display market sentiment (Fear & Greed Index)
 */
async function fetchMarketSentiment() {
    try {
        const url = API_CONFIG.current.baseUrl + '/api/fear-greed';
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
    const emoji = data.rating.includes('Extreme Greed') ? '🤑' :
                  data.rating.includes('Greed') ? '😁' :
                  data.rating.includes('Neutral') ? '😐' :
                  data.rating.includes('Fear') && data.rating.includes('Extreme') ? '😱' : '😨';

    const color = data.rating.includes('Greed') ? '#00ff87' :
                  data.rating.includes('Neutral') ? '#ffaa00' : '#ff4444';

    document.getElementById('sentimentEmoji').textContent = emoji;
    document.getElementById('sentimentRating').textContent = data.rating;
    document.getElementById('sentimentRating').style.color = color;
    document.getElementById('sentimentScore').textContent = `Score: ${data.score}/100 • VIX: ${data.vix.toFixed(2)}`;
    document.getElementById('sentimentSource').textContent = `Source: ${data.source} • Trend: ${data.trend}`;
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
            throw new Error('No data found for this ticker');
        }

        stockData = json.data;
        technicalData = json.data.technical;

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
    document.getElementById('currentPriceDisplay').textContent = `$${stock.currentPrice.toFixed(2)}`;
    document.getElementById('priceRangeDisplay').textContent = `52W Range: $${stock.fiftyTwoWeekLow?.toFixed(2) || '0'} - $${stock.fiftyTwoWeekHigh?.toFixed(2) || '0'}`;

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

    // Show results
    document.getElementById('results').style.display = 'block';
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
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
        emoji = '🎯';
        color = '#00ff87';
        bgGradient = 'linear-gradient(135deg, rgba(0, 255, 135, 0.2), rgba(0, 200, 100, 0.1))';
    } else if (percentage >= 55) {
        recommendation = 'BUY';
        emoji = '✅';
        color = '#00ff87';
        bgGradient = 'linear-gradient(135deg, rgba(0, 255, 135, 0.15), rgba(0, 200, 100, 0.05))';
    } else if (percentage >= 40) {
        recommendation = 'HOLD';
        emoji = '⏸️';
        color = '#ffaa00';
        bgGradient = 'linear-gradient(135deg, rgba(255, 170, 0, 0.15), rgba(255, 140, 0, 0.05))';
    } else if (percentage >= 25) {
        recommendation = 'SELL';
        emoji = '⚠️';
        color = '#ff4444';
        bgGradient = 'linear-gradient(135deg, rgba(255, 68, 68, 0.15), rgba(255, 50, 50, 0.05))';
    } else {
        recommendation = 'STRONG SELL';
        emoji = '🔴';
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
        <h3>📊 Fundamentals ${stars}</h3>
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
        card.innerHTML = '<h3>📈 Technical Analysis</h3><p>No technical data available</p>';
        return;
    }

    const rsiColor = technical.rsi > 70 ? '#ff4444' : technical.rsi < 30 ? '#00ff87' : '#ffaa00';
    const macdSignal = technical.macd > technical.macd_signal ? '🟢 Bullish' : '🔴 Bearish';
    const trendSignal = currentPrice > technical.sma50 && currentPrice > technical.sma200 ? '🟢 Uptrend' : '🔴 Downtrend';

    card.innerHTML = `
        <h3>📈 Technical Analysis ${stars}</h3>
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
                <strong>SMA 50:</strong> $${technical.sma50?.toFixed(2) || 'N/A'}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>SMA 200:</strong> $${technical.sma200?.toFixed(2) || 'N/A'}
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

    let actionText = '';
    let entryPrice = '';
    let stopLoss = '';
    let target = '';
    let waveInfo = '';

    // Use Elliott Wave data if available
    const hasWaveData = tech && tech.entry_level && tech.support_level && tech.resistance_level;

    if (percentage >= 60) {
        actionText = '💰 Consider buying on dips';

        if (hasWaveData) {
            entryPrice = `$${tech.entry_level.toFixed(2)}`;
            stopLoss = `$${(tech.support_level * 0.98).toFixed(2)}`;
            target = `$${tech.resistance_level.toFixed(2)}`;
            waveInfo = `<div style="margin-top: 10px; padding: 8px; background: rgba(0,255,135,0.1); border-radius: 6px; font-size: 0.9em;">
                <strong>📈 Wave Pattern:</strong> ${tech.wave_pattern}<br>
                <small>Support: $${tech.support_level.toFixed(2)} • Resistance: $${tech.resistance_level.toFixed(2)}</small>
            </div>`;
        } else {
            entryPrice = `$${(stock.currentPrice * 0.98).toFixed(2)} - $${(stock.currentPrice * 1.02).toFixed(2)}`;
            stopLoss = `$${(stock.currentPrice * 0.92).toFixed(2)}`;
            target = `$${(stock.currentPrice * 1.15).toFixed(2)}`;
        }

    } else if (percentage >= 40) {
        actionText = '⏸️ Hold current position or wait';

        if (hasWaveData) {
            entryPrice = `Wait for pullback to $${tech.entry_level.toFixed(2)}`;
            stopLoss = `$${(tech.support_level * 0.98).toFixed(2)}`;
            target = `$${(stock.currentPrice * 1.08).toFixed(2)}`;
            waveInfo = `<div style="margin-top: 10px; padding: 8px; background: rgba(255,170,0,0.1); border-radius: 6px; font-size: 0.9em;">
                <strong>📊 Wave Pattern:</strong> ${tech.wave_pattern}<br>
                <small>Better entry expected at support levels</small>
            </div>`;
        } else {
            entryPrice = `Wait for better entry around $${(stock.currentPrice * 0.95).toFixed(2)}`;
            stopLoss = `$${(stock.currentPrice * 0.92).toFixed(2)}`;
            target = `$${(stock.currentPrice * 1.08).toFixed(2)}`;
        }

    } else {
        actionText = '⚠️ Avoid or consider selling';

        if (hasWaveData) {
            entryPrice = `Not recommended (wait for $${tech.entry_level.toFixed(2)})`;
            stopLoss = `$${(stock.currentPrice * 0.97).toFixed(2)}`;
            target = `N/A`;
            waveInfo = `<div style="margin-top: 10px; padding: 8px; background: rgba(255,68,68,0.1); border-radius: 6px; font-size: 0.9em;">
                <strong>🔴 Wave Pattern:</strong> ${tech.wave_pattern}<br>
                <small>Wait for better wave structure</small>
            </div>`;
        } else {
            entryPrice = `Not recommended`;
            stopLoss = `$${(stock.currentPrice * 0.97).toFixed(2)}`;
            target = `N/A`;
        }
    }

    card.innerHTML = `
        <h3>🎯 Action Plan</h3>
        <div style="margin-top: 15px;">
            <div style="margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <strong>${actionText}</strong>
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Entry Price:</strong> ${entryPrice}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Stop Loss:</strong> ${stopLoss}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Target:</strong> ${target}
            </div>
            ${waveInfo}
            <div style="margin-top: 15px; padding: 10px; background: rgba(255,170,0,0.1); border-radius: 8px; font-size: 0.9em;">
                <strong>⚠️ Remember:</strong> This is not financial advice. Always do your own research and never invest more than you can afford to lose.
            </div>
        </div>
    `;
}

/**
 * Helper Functions
 */
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

function hideMessages() {
    document.getElementById('errorMessage').classList.remove('active');
}

function hideResults() {
    document.getElementById('results').style.display = 'none';
}
