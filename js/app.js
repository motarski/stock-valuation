/**
 * Stock Valuation App - Main Application Logic
 */

// Sector average P/E ratios
const sectorPERatios = {
    technology: 28,
    healthcare: 22,
    finance: 12,
    consumer: 20,
    industrial: 18,
    energy: 15,
    utilities: 16,
    realestate: 25,
    materials: 14,
    telecom: 15,
    gaming: 18
};

// Sector growth characteristics
const sectorGrowth = {
    technology: { typical: 20, description: 'High growth, innovation-driven' },
    healthcare: { typical: 12, description: 'Steady growth, demographic tailwinds' },
    finance: { typical: 8, description: 'Moderate growth, cyclical' },
    consumer: { typical: 10, description: 'Consumer spending dependent' },
    industrial: { typical: 9, description: 'Economic cycle sensitive' },
    energy: { typical: 5, description: 'Commodity price dependent' },
    utilities: { typical: 4, description: 'Stable, dividend-focused' },
    realestate: { typical: 7, description: 'Interest rate sensitive' },
    materials: { typical: 6, description: 'Global demand driven' },
    telecom: { typical: 5, description: 'Mature, infrastructure-heavy' },
    gaming: { typical: 15, description: 'Digital transformation, regulatory expansion, global market growth' }
};

let fetchedData = null;

/**
 * Fetch stock data from API
 */
async function fetchStockData() {
    const ticker = document.getElementById('tickerSymbol').value.trim().toUpperCase();

    if (!ticker) {
        showError('Please enter a stock ticker symbol');
        return;
    }

    hideMessages();
    showLoading();

    try {
        // Use API_CONFIG to get the correct URL for the environment
        const url = API_CONFIG.getStockUrl(ticker);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const json = await response.json();

        if (!json.success || !json.data) {
            throw new Error('No data found for this ticker. Please verify the symbol.');
        }

        const data = json.data;
        fetchedData = data;

        document.getElementById('companyName').value = data.companyName || ticker;
        document.getElementById('stockPrice').value  = data.currentPrice != null ? data.currentPrice.toFixed(2) : '';
        document.getElementById('eps').value         = data.eps != null ? data.eps.toFixed(2) : '';
        document.getElementById('bookValue').value   = data.bookValue != null ? data.bookValue.toFixed(2) : '';
        document.getElementById('fcf').value         = data.fcfPerShare != null ? data.fcfPerShare.toFixed(2) : '';

        displayCompanyInfoFromBackend(data);
        autoSelectSector(data.companyName || '');

        showSuccess(`Successfully fetched data for ${ticker}! Review and adjust if needed, then click Analyze.`);
        hideLoading();

    } catch (error) {
        console.error('Error fetching stock data:', error);
        hideLoading();
        showError(
            `Unable to fetch data automatically: ${error.message}\n\n` +
            `Please enter the data manually below. You can find this information on:\n` +
            `• Yahoo Finance (finance.yahoo.com)\n` +
            `• Google Finance\n` +
            `• Company investor relations page`
        );
    }
}

/**
 * Display company information
 */
function displayCompanyInfoFromBackend(data) {
    const infoHTML = `
        <div class="company-info-item">
            <span>Company:</span>
            <span>${data.companyName || 'N/A'}</span>
        </div>
        <div class="company-info-item">
            <span>Symbol:</span>
            <span>${data.symbol || 'N/A'}</span>
        </div>
        <div class="company-info-item">
            <span>Exchange:</span>
            <span>${data.exchange || 'N/A'}</span>
        </div>
        <div class="company-info-item">
            <span>Current Price:</span>
            <span>$${data.currentPrice != null ? data.currentPrice.toFixed(2) : 'N/A'}</span>
        </div>
        <div class="company-info-item">
            <span>Market Cap:</span>
            <span>${formatLargeNumber(data.marketCap)}</span>
        </div>
        <div class="company-info-item">
            <span>P/E Ratio:</span>
            <span>${data.peRatio != null ? data.peRatio.toFixed(2) : 'N/A'}</span>
        </div>
        <div class="company-info-item">
            <span>EPS:</span>
            <span>$${data.eps != null ? data.eps.toFixed(2) : 'N/A'}</span>
        </div>
        <div class="company-info-item">
            <span>Beta:</span>
            <span>${data.beta != null ? data.beta.toFixed(2) : 'N/A'}</span>
        </div>
        <div class="company-info-item">
            <span>52W Range:</span>
            <span>
                ${data.fiftyTwoWeekLow != null ? data.fiftyTwoWeekLow.toFixed(2) : 'N/A'}
                -
                ${data.fiftyTwoWeekHigh != null ? data.fiftyTwoWeekHigh.toFixed(2) : 'N/A'}
            </span>
        </div>
        <div class="company-info-item">
            <span>Sector:</span>
            <span>${data.sector || 'N/A'}</span>
        </div>
        <div class="company-info-item">
            <span>Industry:</span>
            <span>${data.industry || 'N/A'}</span>
        </div>
        <div class="company-info-item">
            <span>Revenue:</span>
            <span>${formatLargeNumber(data.totalRevenue)}</span>
        </div>
        <div class="company-info-item">
            <span>Revenue Growth:</span>
            <span>${data.revenueGrowth != null ? (data.revenueGrowth * 100).toFixed(1) + '%' : 'N/A'}</span>
        </div>
    `;

    document.getElementById('companyInfoGrid').innerHTML = infoHTML;
    document.getElementById('companyInfoSection').style.display = 'block';
}

/**
 * Auto-select sector based on company name
 */
function autoSelectSector(companyName) {
    const name = companyName.toLowerCase();

    if (name.includes('gaming') || name.includes('betting') || name.includes('casino') || name.includes('kambi')) {
        document.getElementById('sector').value = 'gaming';
    } else if (name.includes('tech') || name.includes('software') || name.includes('apple') || name.includes('microsoft')) {
        document.getElementById('sector').value = 'technology';
    } else if (name.includes('pharma') || name.includes('health') || name.includes('medical')) {
        document.getElementById('sector').value = 'healthcare';
    } else if (name.includes('bank') || name.includes('financial') || name.includes('insurance')) {
        document.getElementById('sector').value = 'finance';
    }
}

/**
 * Format large numbers (e.g., $1.2B, $345M)
 */
function formatLargeNumber(num) {
    if (!num) return 'N/A';
    if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    return '$' + num.toFixed(2);
}

/**
 * UI Helper Functions
 */
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

function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.classList.add('active');
}

function hideMessages() {
    document.getElementById('errorMessage').classList.remove('active');
    document.getElementById('successMessage').classList.remove('active');
}

/**
 * Analyze stock with multiple valuation methods
 */
function analyzeStock() {
    const companyName = document.getElementById('companyName').value;
    const stockPrice = parseFloat(document.getElementById('stockPrice').value);
    const eps = parseFloat(document.getElementById('eps').value);
    const bookValue = parseFloat(document.getElementById('bookValue').value);
    const growthRate = parseFloat(document.getElementById('growthRate').value) / 100;
    const requiredReturn = parseFloat(document.getElementById('requiredReturn').value) / 100;
    const sector = document.getElementById('sector').value;
    const fcf = parseFloat(document.getElementById('fcf').value);

    if (!companyName || !stockPrice || !eps || !sector) {
        alert('Please fill in at least Company Name, Stock Price, EPS, and Sector');
        return;
    }

    // Calculate P/E Ratio
    const peRatio = stockPrice / eps;
    const sectorPE = sectorPERatios[sector];

    // Calculate Intrinsic Value (Dividend Discount Model)
    const estimatedDividend = eps * 0.4;
    let intrinsicValue = 0;

    if (requiredReturn > growthRate) {
        intrinsicValue = estimatedDividend / (requiredReturn - growthRate);
    } else {
        intrinsicValue = stockPrice * 1.2;
    }

    // Calculate DCF Value
    let dcfValue = 0;
    if (fcf && requiredReturn > growthRate) {
        dcfValue = fcf / (requiredReturn - growthRate);
    } else if (fcf) {
        let totalPV = 0;
        for (let i = 1; i <= 5; i++) {
            const projectedFCF = fcf * Math.pow(1 + growthRate, i);
            const pv = projectedFCF / Math.pow(1 + requiredReturn, i);
            totalPV += pv;
        }
        const terminalValue = (fcf * Math.pow(1 + growthRate, 5) * 1.02) / (requiredReturn - 0.02);
        const terminalPV = terminalValue / Math.pow(1 + requiredReturn, 5);
        dcfValue = totalPV + terminalPV;
    }

    // Calculate Price to Book Ratio
    const pbRatio = bookValue ? (stockPrice / bookValue) : 0;

    // Display Metrics
    document.getElementById('peRatio').textContent = peRatio.toFixed(2);
    document.getElementById('peComparison').textContent =
        `Sector avg: ${sectorPE} | ${peRatio > sectorPE ? 'Above' : 'Below'} average`;

    document.getElementById('intrinsicValue').textContent = `$${intrinsicValue.toFixed(2)}`;
    const valueGap = ((intrinsicValue - stockPrice) / stockPrice * 100).toFixed(1);
    document.getElementById('valueGap').textContent =
        `${valueGap > 0 ? '+' : ''}${valueGap}% vs current price`;

    if (dcfValue > 0) {
        document.getElementById('dcfValue').textContent = `$${dcfValue.toFixed(2)}`;
    } else {
        document.getElementById('dcfValue').textContent = 'N/A';
    }

    if (pbRatio > 0) {
        document.getElementById('pbRatio').textContent = pbRatio.toFixed(2);
    } else {
        document.getElementById('pbRatio').textContent = 'N/A';
    }

    // P/E Analysis
    let peAnalysisText = `The current P/E ratio of ${peRatio.toFixed(2)} `;
    if (peRatio < sectorPE * 0.8) {
        peAnalysisText += `is significantly below the ${sector} sector average of ${sectorPE}, suggesting the stock may be undervalued or facing company-specific challenges.`;
    } else if (peRatio > sectorPE * 1.2) {
        peAnalysisText += `is significantly above the ${sector} sector average of ${sectorPE}, indicating premium valuation or strong growth expectations.`;
    } else {
        peAnalysisText += `is relatively in line with the ${sector} sector average of ${sectorPE}, suggesting fair market valuation.`;
    }
    document.getElementById('peAnalysis').textContent = peAnalysisText;

    // Intrinsic Value Analysis
    let intrinsicAnalysisText = '';
    if (intrinsicValue > stockPrice * 1.15) {
        intrinsicAnalysisText = `Based on the Dividend Discount Model, the intrinsic value of $${intrinsicValue.toFixed(2)} suggests the stock is potentially undervalued by ${valueGap}%. This could represent a buying opportunity if fundamentals support the growth assumptions.`;
    } else if (intrinsicValue < stockPrice * 0.85) {
        intrinsicAnalysisText = `The intrinsic value of $${intrinsicValue.toFixed(2)} is below the current market price, suggesting the stock may be overvalued. The market is pricing in ${Math.abs(parseFloat(valueGap))}% more value than fundamental analysis suggests.`;
    } else {
        intrinsicAnalysisText = `The intrinsic value of $${intrinsicValue.toFixed(2)} is close to the current market price, indicating the stock is fairly valued according to dividend discount analysis.`;
    }
    document.getElementById('intrinsicAnalysis').textContent = intrinsicAnalysisText;

    // Growth Projections
    const growthProjectionsHTML = `
        <li><strong>Year 1 EPS Projection:</strong> $${(eps * (1 + growthRate)).toFixed(2)}</li>
        <li><strong>Year 3 EPS Projection:</strong> $${(eps * Math.pow(1 + growthRate, 3)).toFixed(2)}</li>
        <li><strong>Year 5 EPS Projection:</strong> $${(eps * Math.pow(1 + growthRate, 5)).toFixed(2)}</li>
        <li><strong>Expected Growth Rate:</strong> ${(growthRate * 100).toFixed(1)}% annually</li>
        <li><strong>Required Rate of Return:</strong> ${(requiredReturn * 100).toFixed(1)}%</li>
    `;
    document.getElementById('growthProjections').innerHTML = growthProjectionsHTML;

    // Sector Analysis
    const sectorInfo = sectorGrowth[sector];
    let sectorAnalysisText = `In the ${sector} sector, typical growth rates are around ${sectorInfo.typical}% annually. `;
    sectorAnalysisText += `This sector is characterized by: ${sectorInfo.description}. `;

    if (growthRate * 100 > sectorInfo.typical * 1.5) {
        sectorAnalysisText += `Your expected growth rate of ${(growthRate * 100).toFixed(1)}% is significantly higher than sector average, which may be ambitious unless the company has strong competitive advantages.`;
    } else if (growthRate * 100 < sectorInfo.typical * 0.5) {
        sectorAnalysisText += `Your expected growth rate of ${(growthRate * 100).toFixed(1)}% is below sector average, suggesting conservative expectations or potential headwinds.`;
    } else {
        sectorAnalysisText += `Your expected growth rate of ${(growthRate * 100).toFixed(1)}% is reasonable for this sector.`;
    }
    document.getElementById('sectorAnalysis').textContent = sectorAnalysisText;

    // Generate Recommendation
    let score = 0;
    let recommendation = '';
    let recommendationType = '';

    if (peRatio < sectorPE * 0.85) score += 2;
    else if (peRatio < sectorPE) score += 1;
    else if (peRatio > sectorPE * 1.3) score -= 2;
    else if (peRatio > sectorPE * 1.1) score -= 1;

    if (intrinsicValue > stockPrice * 1.2) score += 2;
    else if (intrinsicValue > stockPrice * 1.05) score += 1;
    else if (intrinsicValue < stockPrice * 0.8) score -= 2;
    else if (intrinsicValue < stockPrice * 0.95) score -= 1;

    if (dcfValue > stockPrice * 1.15) score += 1;
    else if (dcfValue > 0 && dcfValue < stockPrice * 0.85) score -= 1;

    if (pbRatio > 0 && pbRatio < 1.5) score += 1;
    else if (pbRatio > 5) score -= 1;

    if (score >= 3) {
        recommendationType = 'buy';
        recommendation = `🎯 <strong>BUY</strong> - ${companyName} appears undervalued based on fundamental analysis. Multiple metrics suggest upside potential.`;
    } else if (score <= -3) {
        recommendationType = 'sell';
        recommendation = `⚠️ <strong>SELL / AVOID</strong> - ${companyName} appears overvalued. Consider waiting for better entry point or avoiding this investment.`;
    } else {
        recommendationType = 'hold';
        recommendation = `⏸️ <strong>HOLD / NEUTRAL</strong> - ${companyName} is fairly valued. Consider holding if you own it, or wait for more attractive pricing if considering purchase.`;
    }

    const recommendationEl = document.getElementById('recommendation');
    recommendationEl.className = `recommendation ${recommendationType}`;
    recommendationEl.innerHTML = recommendation;

    document.getElementById('results').classList.add('active');
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
