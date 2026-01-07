/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { RouteDetails, StorySegment, StoryStyle } from "../types";
import { base64ToArrayBuffer, pcmToWav } from "./audioUtils";

// Sanitize the key to ensure no extra quotes or whitespace
const RAW_API_KEY = process.env.HACKCLUB_API_KEY;
const API_KEY = RAW_API_KEY ? RAW_API_KEY.replace(/["']/g, "").trim() : "";

if (!API_KEY) {
    console.warn("ECHO_PATHS WARNING: HACKCLUB_API_KEY is missing from environment.");
}

const HACKCLUB_API_URL = "https://ai.hackclub.com/proxy/v1/chat/completions";

// CONSTANTS FOR CONTINUOUS STREAMING
const TARGET_SEGMENT_DURATION_SEC = 60; 
const WORDS_PER_MINUTE = 145;
const WORDS_PER_SEGMENT = Math.round((TARGET_SEGMENT_DURATION_SEC / 60) * WORDS_PER_MINUTE);

export const calculateTotalSegments = (durationSeconds: number): number => {
    return Math.max(1, Math.ceil(durationSeconds / TARGET_SEGMENT_DURATION_SEC));
};

const getStyleInstruction = (style: StoryStyle): string => {
    switch (style) {
        case 'NOIR':
            return "Style: Noir Thriller. Gritty, cynical, atmospheric. Use inner monologue. The traveler is a detective or someone with a troubled past. The city is a character itself—dark, rainy, hiding secrets. Use metaphors of shadows, smoke, and cold neon.";
        case 'CHILDREN':
            return "Style: Children's Story. Whimsical, magical, full of wonder and gentle humor. The world is bright and alive; maybe inanimate objects (like traffic lights or trees) have slight personalities. Simple but evocative language. A sense of delightful discovery.";
        case 'HISTORICAL':
            return "Style: Historical Epic. Grandiose, dramatic, and timeless. Treat the journey as a significant pilgrimage or quest in a bygone era (even though it's modern day, overlay it with historical grandeur). Use slightly archaic but understandable language. Focus on endurance, destiny, and the weight of history.";
        case 'FANTASY':
            return "Style: Fantasy Adventure. Heroic, mystical, and epic. The real world is just a veil over a magical realm. Streets are ancient paths, buildings are towers or ruins. The traveler is on a vital quest. Use metaphors of magic, mythical creatures (shadows might be lurking beasts), and destiny.";
        default:
            return "Style: Immersive, 'in the moment' narration. Focus on the sensation of movement and the immediate environment.";
    }
};

const makeHackClubRequest = async (messages: any[], model: string = "qwen/qwen3-32b"): Promise<string> => {
    const response = await fetch(HACKCLUB_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 1.0,
            max_tokens: 2000,
        }),
    });

    if (!response.ok) {
        throw new Error(`Hack Club API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
};

export const generateStoryOutline = async (
    route: RouteDetails,
    totalSegments: number
): Promise<string[]> => {
    const styleInstruction = getStyleInstruction(route.storyStyle);
    const prompt = `
    You are an expert storyteller. Write an outline for a story that is exactly ${totalSegments} chapters long and has a complete cohesive story arc with a clear set up, inciting incident, rising action, climax, success, falling action, and resolution. 

    Your outline should be tailored to match this journey:

    Journey: ${route.startAddress} to ${route.endAddress} by ${route.travelMode.toLowerCase()}.
    Total Duration: Approx ${route.duration}.
    Total Narrative Segments needed: ${totalSegments}.
    
    ${styleInstruction}

    Output strictly valid JSON: An array of ${totalSegments} strings. Example: ["Chapter 1 summary...", "Chapter 2 summary...", ...]
    `;

    try {
        const response = await makeHackClubRequest([
            { role: "user", content: prompt }
        ]);

        const text = response?.trim();
        if (!text) throw new Error("No outline generated.");
        
        // Extract JSON from response in case there's extra text
        const jsonMatch = text.match(/\[.*\]/s);
        const jsonString = jsonMatch ? jsonMatch[0] : text;
        const outline = JSON.parse(jsonString);
        
        if (!Array.isArray(outline) || outline.length === 0) {
             throw new Error("Invalid outline format received.");
        }

        // Ensure we have exactly enough segments, pad if necessary
        while (outline.length < totalSegments) {
            outline.push("Continue the journey towards the destination.");
        }

        const finalOutline = outline.slice(0, totalSegments);
        console.log(">> STORY OUTLINE:", finalOutline);
        return finalOutline;

    } catch (error) {
        console.error("Outline Generation Error:", error);
        // Fallback outline if generation fails
        return Array(totalSegments).fill("Continue the immersive narrative of the journey.");
    }
};

export const generateSegment = async (
    route: RouteDetails,
    segmentIndex: number,
    totalSegmentsEstimate: number,
    segmentOutline: string,
    previousContext: string = ""
): Promise<StorySegment> => {

  const isFirst = segmentIndex === 1;

  let contextPrompt = "";
  if (!isFirst) {
      contextPrompt = `
      PREVIOUS NARRATIVE CONTEXT (The story so far):
      ...${previousContext.slice(-1500)} 
      (CONTINUE SEAMLESSLY from the above. Do not repeat it. Do not start with "And so..." or similar connectors every time.)
      `;
  }

  const styleInstruction = getStyleInstruction(route.storyStyle);

  const prompt = `
    You are an AI storytelling engine generating a continuous, immersive audio stream for a traveler.
    Journey: ${route.startAddress} to ${route.endAddress} by ${route.travelMode.toLowerCase()}.
    Current Status: Segment ${segmentIndex} of approx ${totalSegmentsEstimate}.
    
    ${styleInstruction}

    CURRENT CHAPTER GOAL: ${segmentOutline}

    ${contextPrompt}

    Task: Write the next ~${TARGET_SEGMENT_DURATION_SEC} seconds of narration (approx ${WORDS_PER_SEGMENT} words) based on the Current Chapter Goal.
    Keep the narrative moving forward. This is a transient segment of a longer journey.

    IMPORTANT: Output ONLY the raw narration text for this segment. Do not include titles, chapter headings, or JSON. Just the text to be spoken.
  `;

  try {
    const response = await makeHackClubRequest([
        { role: "user", content: prompt }
    ]);

    const text = response?.trim();
    if (!text) throw new Error("No text generated for segment.");

    return {
      index: segmentIndex,
      text: text,
      audioBuffer: null // Audio generated separately
    };

  } catch (error) {
    console.error(`Segment ${segmentIndex} Text Generation Error:`, error);
    throw error; // Re-throw to be caught by buffering engine
  }
};

export const generateSegmentAudio = async (text: string, audioContext: AudioContext, voiceName: string = 'Kore'): Promise<AudioBuffer> => {
  // Hack Club API doesn't support TTS directly, so we'll need to use a different service
  // For now, let's create a simple placeholder that generates a silent audio buffer
  // In a real implementation, you'd want to integrate with a TTS service like OpenAI's TTS or similar
  
  try {
    // Generate a simple audio buffer with silence for now
    // This is a placeholder - you'll need to integrate with an actual TTS service
    const sampleRate = 24000;
    const duration = text.length * 0.08; // Rough estimate of audio duration
    const length = Math.floor(sampleRate * duration);
    
    const audioBuffer = audioContext.createBuffer(1, length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    // Fill with silence (you could add a simple tone or use a real TTS service here)
    for (let i = 0; i < length; i++) {
      channelData[i] = 0;
    }
    
    console.warn("Audio generation is using placeholder silence. Integrate with a real TTS service for production.");
    
    return audioBuffer;

  } catch (error) {
    console.error("Audio Generation Error:", error);
    throw error; // Re-throw to be caught by buffering engine
  }
};
