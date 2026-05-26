// Vercel Serverless Function to proxy image generation APIs
// Deploy to Vercel: https://vercel.com/import/project

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, model } = req.body;

    if (!prompt || !model) {
        return res.status(400).json({ error: 'Missing prompt or model' });
    }

    try {
        let imageUrl;

        if (model === 'deepai') {
            imageUrl = await generateWithDeepAI(prompt);
        } else if (model === 'replicate') {
            imageUrl = await generateWithReplicate(prompt);
        } else if (model === 'together') {
            imageUrl = await generateWithTogetherAI(prompt);
        } else {
            return res.status(400).json({ error: 'Unknown model' });
        }

        return res.status(200).json({ success: true, imageUrl });
    } catch (error) {
        console.error('Generation error:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function generateWithDeepAI(prompt) {
    const response = await fetch('https://api.deepai.org/api/text2img', {
        method: 'POST',
        headers: {
            'api-key': process.env.DEEPAI_API_KEY || 'dummy-key'
        },
        body: new URLSearchParams({
            text: prompt
        })
    });

    if (!response.ok) {
        throw new Error(`Deep AI error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.output_url) {
        throw new Error('No output URL from Deep AI');
    }

    return data.output_url;
}

async function generateWithReplicate(prompt) {
    // Step 1: Create prediction
    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN || 'dummy-token'}`
        },
        body: JSON.stringify({
            version: '9b1c3d31975870ff4628a47e56fbb022f7a13172098a5b56e398fdacc4b20d25',
            input: {
                prompt: prompt,
                width: 512,
                height: 512,
                num_inference_steps: 25
            }
        })
    });

    if (!createResponse.ok) {
        throw new Error(`Replicate error: ${createResponse.status}`);
    }

    const prediction = await createResponse.json();
    const predictionId = prediction.id;

    // Step 2: Poll for result (max 2 minutes)
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
        const checkResponse = await fetch(
            `https://api.replicate.com/v1/predictions/${predictionId}`,
            {
                headers: {
                    'Authorization': `Token ${process.env.REPLICATE_API_TOKEN || 'dummy-token'}`
                }
            }
        );

        const result = await checkResponse.json();

        if (result.status === 'succeeded') {
            if (result.output && result.output[0]) {
                return result.output[0];
            }
            throw new Error('No output from Replicate');
        }

        if (result.status === 'failed') {
            throw new Error(`Replicate failed: ${result.error}`);
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Replicate timeout');
}

async function generateWithTogetherAI(prompt) {
    const response = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.TOGETHER_API_KEY || 'dummy-key'}`
        },
        body: JSON.stringify({
            prompt: prompt,
            model: 'black-forest-labs/FLUX.1-dev',
            width: 512,
            height: 512,
            steps: 4
        })
    });

    if (!response.ok) {
        throw new Error(`Together AI error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.data || !data.data[0] || !data.data[0].url) {
        throw new Error('No output URL from Together AI');
    }

    return data.data[0].url;
}
