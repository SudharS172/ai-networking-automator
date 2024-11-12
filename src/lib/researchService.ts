import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ResearchResult {
  name: string;
  phoneNumber: string;
  details: string;
  price: number | null;
  rating?: string;
  address?: string;
  businessType?: string;
}

async function extractLocation(
  query: string
): Promise<{ location: string; scope: string }> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Analyze this search query: "${query}"
    Extract the location information in JSON format:
    {
      "location": "specific location name",
      "scope": "city/state/country/area/continent/world",
      "searchText": "formatted location for search"
    }

    Examples:
    "best restaurants in NYC" -> {"location": "New York City", "scope": "city", "searchText": "New York, NY"}
    "car shops in Texas" -> {"location": "Texas", "scope": "state", "searchText": "Texas"}
    "coffee shops in Brooklyn" -> {"location": "Brooklyn", "scope": "area", "searchText": "Brooklyn, NY"}
    "best hotels in Europe" -> {"location": "Europe", "scope": "continent", "searchText": "Europe"}
    
    If no location specified, return scope as "world".
    Return only the JSON object.`;

  try {
    const result = await model.generateContent(prompt);
    const locationInfo = JSON.parse(result.response.text().trim());
    console.log("Extracted location info:", locationInfo);
    return locationInfo;
  } catch (error) {
    console.error("Error extracting location:", error);
    return { location: "worldwide", scope: "world", searchText: "" };
  }
}

async function getVerifiedBusinessInfo(
  name: string,
  locationInfo: any
): Promise<any> {
  try {
    // Construct search query based on scope
    const searchQuery = `${name} in ${locationInfo.searchText}`;
    console.log("Searching for:", searchQuery);

    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      searchQuery
    )}&key=${process.env.GOOGLE_PLACES_API_KEY}`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.results && searchData.results.length > 0) {
      // Filter results based on location scope
      const validResults = searchData.results.filter((place) => {
        const address = place.formatted_address.toLowerCase();
        const searchLocation = locationInfo.searchText.toLowerCase();

        switch (locationInfo.scope) {
          case "city":
            return address.includes(searchLocation);
          case "state":
            return address.includes(locationInfo.location.toLowerCase());
          case "area":
            return address.includes(searchLocation);
          case "country":
          case "continent":
          case "world":
            return true; // Accept any result for broader scopes
          default:
            return true;
        }
      });

      if (validResults.length === 0) return null;

      const place = validResults[0];
      const placeId = place.place_id;

      // Get detailed information
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,international_phone_number,rating,price_level&key=${process.env.GOOGLE_PLACES_API_KEY}`;

      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.result) {
        return {
          name: detailsData.result.name,
          phoneNumber: detailsData.result.international_phone_number,
          address: detailsData.result.formatted_address,
          rating: detailsData.result.rating?.toString(),
          price: detailsData.result.price_level,
          placeId,
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting place details:", error);
    return null;
  }
}

async function searchWithGemini(query: string): Promise<ResearchResult[]> {
  // Extract location information
  const locationInfo = await extractLocation(query);
  console.log("Location info:", locationInfo);

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Search for the best businesses matching: "${query}"
    Location scope: ${locationInfo.location} (${locationInfo.scope})
    
    Return results as JSON array:
    [
      {
        "name": "Exact Business Name",
        "details": "Detailed description of the business, including what makes it special",
        "businessType": "Specific type of business"
      }
    ]
    
    Requirements:
    - Only include real, operating businesses
    - Must be in ${locationInfo.location}
    - Include highly-rated and popular establishments
    
    Return only the JSON array.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("Initial Gemini results:", text);

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const initialResults = JSON.parse(jsonMatch[0]);
    console.log("Found businesses:", initialResults);

    // Get verified information for each business
    const verifiedResults = await Promise.all(
      initialResults.map(async (result: any) => {
        console.log(`Verifying business: ${result.name}`);
        const verifiedInfo = await getVerifiedBusinessInfo(
          result.name,
          locationInfo
        );

        if (verifiedInfo && verifiedInfo.phoneNumber) {
          return {
            name: verifiedInfo.name,
            phoneNumber: verifiedInfo.phoneNumber,
            details: result.details,
            price: verifiedInfo.price ? verifiedInfo.price * 25 : null,
            rating: verifiedInfo.rating,
            address: verifiedInfo.address,
            businessType: result.businessType,
          };
        }
        return null;
      })
    );

    const validResults = verifiedResults.filter((result) => result !== null);
    console.log("Final verified results:", validResults);

    return validResults;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

export async function researchWithPerplexity(
  query: string
): Promise<ResearchResult[]> {
  const results = await searchWithGemini(query);

  // If no results found, try with a broader scope
  if (results.length === 0) {
    console.log("No results found, trying broader search...");
    const broadQuery = query.replace(/\bin\b.*$/, "").trim();
    return searchWithGemini(broadQuery);
  }

  return results;
}

export type { ResearchResult };
