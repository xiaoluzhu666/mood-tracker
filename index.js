const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (resets on server restart)
// For persistence, data is also written to a JSON file
const DATA_FILE = path.join(__dirname, 'data', 'ratings.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// Load existing data if available
let ratingsHistory = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    ratingsHistory = JSON.parse(data);
  } catch (error) {
    console.log('No existing data found, starting fresh');
  }
}

// Save ratings to file
function saveRatings() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(ratingsHistory, null, 2));
}

// Preloaded activities list
const ACTIVITIES = [
  'Bath / shower',
  'Listening to music',
  'Talking to friends',
  'Watching a movie',
  'Exercise',
  'Journaling',
  'Drawing or doodling',
  'Walking outside',
  'Meditation',
  'Cooking or baking',
  'Shopping for clothes',
  'Massage',
  'Looking at old photos',
  'Writing a letter',
  'Playing games',
  'Photography',
  'Going to the beach',
  'Riding a bike',
  'Watching TV series',
  'Drinking coffee or tea'
];

// Rating labels for context
const RATING_LABELS = {
  '-2': 'hate',
  '-1': 'dislike',
  '0': 'neutral',
  '1': 'like',
  '2': 'love'
};

// Placeholder LLM call function
// Replace this with actual Claude API call when you have an API key
async function callLLM(prompt) {
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  if (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'your_claude_api_key_here') {
    console.log('No Claude API key found, using placeholder response');
    return generatePlaceholderResponse(prompt);
  }

  try {
    // Actual Claude API call
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error.message);
    return generatePlaceholderResponse(prompt);
  }
}

// Placeholder response generator for testing without API key
function generatePlaceholderResponse(prompt) {
  // Extract activities from the prompt to create contextual responses
  const promptLower = prompt.toLowerCase();

  // Determine likely boosters and drainers based on simple keyword matching
  const boosters = [];
  const drainers = [];

  if (promptLower.includes('exercise') && promptLower.includes('"rating": 2')) {
    boosters.push({ activity: 'Exercise', rating: 2, note: 'Great energy boost' });
  }
  if (promptLower.includes('meditation') && promptLower.includes('"rating": 2')) {
    boosters.push({ activity: 'Meditation', rating: 2, note: 'Calming and centering' });
  }
  if (promptLower.includes('listening to music') && promptLower.includes('"rating": 2')) {
    boosters.push({ activity: 'Listening to music', rating: 2, note: 'Mood lifter' });
  }

  if (promptLower.includes('shopping') && promptLower.includes('"rating": -2')) {
    drainers.push({ activity: 'Shopping for clothes', rating: -2, note: 'Causes stress' });
  }

  // Ensure we have some data for the placeholder
  if (boosters.length === 0) {
    boosters.push(
      { activity: 'Listening to music', rating: 2, note: 'Consistently uplifting' },
      { activity: 'Talking to friends', rating: 2, note: 'Social connection' }
    );
  }

  if (drainers.length === 0) {
    drainers.push(
      { activity: 'Shopping for clothes', rating: -1, note: 'Can be overwhelming' }
    );
  }

  const placeholderResponse = {
    overall_tone: 'balanced_with_positive_tendencies',
    overall_tone_description: 'Your responses show a generally positive outlook with certain activities providing significant emotional boosts. There are some stressors to be mindful of.',
    boosters: boosters.slice(0, 3),
    drainers: drainers.slice(0, 3),
    ar_vr_recommendations: [
      {
        id: 'vr_beach_escape',
        title: 'Peaceful Beach Visualization',
        energy_level: 'low',
        duration_minutes: 5,
        description: 'A gentle immersive experience for when you need calm',
        script: "Welcome to your peaceful beach. Feel the warm sand beneath your feet. Listen to the gentle rhythm of waves rolling in. With each breath, imagine the salty air filling your lungs. You're safe here. This moment is just for you. Breathe in... and out... Let the worries drift away with the tide.",
        visual_elements: ['gentle waves', 'warm sunset', 'soft sand'],
        audio_elements: ['ocean waves', 'seagulls in distance', 'soft breeze']
      },
      {
        id: 'vr_forest_walk',
        title: 'Enchanted Forest Stroll',
        energy_level: 'low',
        duration_minutes: 7,
        description: 'A grounding nature walk for mental clarity',
        script: "You're walking through a sun-dappled forest. Notice how the light filters through the leaves, creating dancing patterns. Feel the soft moss underfoot. Hear the distant stream and birds singing. Each step grounds you more deeply into this peaceful place. You belong here, in this moment of tranquility.",
        visual_elements: ['tall trees', 'sunlight rays', 'wildflowers'],
        audio_elements: ['rustling leaves', 'gentle stream', 'bird songs']
      },
      {
        id: 'ar_breathing_guide',
        title: 'AR Breathing Companion',
        energy_level: 'very_low',
        duration_minutes: 3,
        description: 'A gentle breathing exercise with visual guidance',
        script: "Find a comfortable position. Watch the glowing orb in front of you. As it expands, breathe in slowly... 1... 2... 3... 4. As it contracts, breathe out gently... 1... 2... 3... 4... 5... 6. Continue following the orb. Your breath is an anchor, bringing you back to the present moment.",
        visual_elements: ['expanding orb', 'soft particles', 'calming gradient'],
        audio_elements: ['soft chimes', 'ambient drone', 'breath cues']
      }
    ],
    insights: {
      pattern_detected: 'Creative and social activities appear most beneficial',
      suggestion: 'Consider scheduling regular music listening and friend time',
      energy_balance: 'Moderate energy output with good recovery activities'
    },
    timestamp: new Date().toISOString()
  };

  return JSON.stringify(placeholderResponse, null, 2);
}

// Build emotional analysis prompt
function buildAnalysisPrompt(ratings) {
  const ratingDescriptions = ratings.map(r => {
    const label = RATING_LABELS[r.rating.toString()];
    const noteText = r.note ? ` (Note: "${r.note}")` : '';
    return `- ${r.activity}: ${r.rating} (${label})${noteText}`;
  }).join('\n');

  const prompt = `You are an emotional regulation specialist and wellness coach. Analyze the following activity ratings from a mood tracking session.

## User's Activity Ratings (scale: -2=hate, -1=dislike, 0=neutral, 1=like, 2=love):
${ratingDescriptions}

## Task:
Provide a comprehensive emotional analysis in the following JSON format:

{
  "overall_tone": "brief_descriptor_like_optimistic_or_mixed",
  "overall_tone_description": "2-3 sentences summarizing emotional patterns",
  "boosters": [
    {
      "activity": "activity_name",
      "rating": 2,
      "note": "why this helps"
    }
  ],
  "drainers": [
    {
      "activity": "activity_name",
      "rating": -2,
      "note": "why this drains"
    }
  ],
  "ar_vr_recommendations": [
    {
      "id": "unique_identifier",
      "title": "Experience Title",
      "energy_level": "low|very_low|moderate",
      "duration_minutes": 5,
      "description": "Brief description of the experience",
      "script": "Immersive guided script text (50-100 words) that could be narrated in AR/VR",
      "visual_elements": ["element1", "element2", "element3"],
      "audio_elements": ["sound1", "sound2", "sound3"]
    }
  ],
  "insights": {
    "pattern_detected": "key pattern from ratings",
    "suggestion": "actionable advice",
    "energy_balance": "assessment of energy"
  },
  "timestamp": "ISO8601_timestamp"
}

Guidelines for AR/VR recommendations:
- Provide exactly 3 recommendations
- Each should be low-energy and calming (suitable for emotional regulation)
- Scripts should be immersive, sensory, and grounding
- Consider the user's boosters - reference elements from activities they rated highly
- Scripts should be suitable for voice narration in immersive environments
- Include specific visual and audio elements for AR/VR developers to implement

Respond ONLY with valid JSON, no markdown formatting or extra text.`;

  return prompt;
}

// Routes

// Get activities list
app.get('/api/activities', (req, res) => {
  res.json({ activities: ACTIVITIES });
});

// Submit ratings and get analysis
app.post('/api/ratings', async (req, res) => {
  try {
    const { ratings, timestamp } = req.body;

    if (!ratings || !Array.isArray(ratings)) {
      return res.status(400).json({ error: 'Ratings array is required' });
    }

    // Validate ratings
    for (const rating of ratings) {
      if (!rating.activity || typeof rating.rating !== 'number') {
        return res.status(400).json({ error: 'Each rating must have activity and rating' });
      }
      if (rating.rating < -2 || rating.rating > 2) {
        return res.status(400).json({ error: 'Rating must be between -2 and 2' });
      }
    }

    // Create entry
    const entry = {
      id: Date.now().toString(),
      timestamp: timestamp || new Date().toISOString(),
      ratings: ratings
    };

    // Save to history
    ratingsHistory.push(entry);
    saveRatings();

    // Build prompt and call LLM
    const prompt = buildAnalysisPrompt(ratings);
    console.log('Calling LLM with prompt...');

    const llmResponse = await callLLM(prompt);

    // Parse LLM response (handle potential JSON parsing issues)
    let analysis;
    try {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = llmResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
                       llmResponse.match(/```\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : llmResponse;
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing LLM response:', parseError);
      // Fallback to placeholder if parsing fails
      analysis = JSON.parse(generatePlaceholderResponse(prompt));
    }

    // Add entry ID to analysis for reference
    analysis.entry_id = entry.id;

    res.json({
      success: true,
      entry_id: entry.id,
      analysis: analysis
    });

  } catch (error) {
    console.error('Error processing ratings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get rating history
app.get('/api/history', (req, res) => {
  res.json({ history: ratingsHistory });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    entries_count: ratingsHistory.length
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║        Mood Tracker Backend Server                     ║
║                                                        ║
║   Server running on http://localhost:${PORT}              ║
║                                                        ║
║   Endpoints:                                           ║
║   - GET  /api/activities    - List all activities     ║
║   - POST /api/ratings       - Submit ratings          ║
║   - GET  /api/history       - View rating history     ║
║   - GET  /api/health        - Health check            ║
║                                                        ║
║   Status: ${process.env.CLAUDE_API_KEY && process.env.CLAUDE_API_KEY !== 'your_claude_api_key_here' ? 'Using Claude API' : 'Using placeholder responses'}
╚════════════════════════════════════════════════════════╝
  `);
});
