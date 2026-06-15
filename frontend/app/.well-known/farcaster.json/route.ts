function withValidProperties(
    properties: Record<string, undefined | string | string[]>
) {
    return Object.fromEntries(
        Object.entries(properties).filter(([_, value]) =>
            Array.isArray(value) ? value.length > 0 : !!value
        )
    );
}

export async function GET() {
    // const URL = process.env.NEXT_PUBLIC_URL as string;
    return Response.json({
        accountAssociation: {
            header: "eyJmaWQiOjIwOTE3MjQsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHhGYmJiNGFBOEI1NTE4YjU3Qzc2Njg3Mzk0NkU0NjE3ZkU1QzI4Q0ExIn0",
            payload: "eyJkb21haW4iOiJhdmlhdG9yLXNhbmQudmVyY2VsLmFwcCJ9",
            signature: "54pQf0+CTjSG+6HRBTtk9M+NLI8nndN7AluSJLjnYct32pI2JMXGPsgoCFu5cBknIwa+SLbPw82PjZYeWNKWkBw="
        },
        miniapp: {
            version: "1",
            name: "Spaceship",
            homeUrl: "https://spaceship-sand.vercel.app",
            iconUrl: "https://spaceship-sand.vercel.app/logo.png",
            imageUrl: "https://spaceship-sand.vercel.app/plane.png",
            buttonTitle: "Play",
            splashImageUrl: "https://spaceship-sand.vercel.app/Spaceship-Logo.png",
            splashBackgroundColor: "#000000",
            webhookUrl: "https://spaceship-sand.vercel.app/api/webhook",
            subtitle: "Fast, fun, social",
            description: "Spaceship - Multiply your fund with fun",
            screenshotUrls: [
                "https://spaceship-sand.vercel.app/spaceship-game.png",
                "https://spaceship-sand.vercel.app/spaceship-game.png",
                "https://spaceship-sand.vercel.app/spaceship-game.png",
            ],
            primaryCategory: "social",
            tags: ["spaceship", "miniapp", "baseapp"],
            heroImageUrl: "https://spaceship-sand.vercel.app/spaceship.png",
            tagline: "Play instantly",
            ogTitle: "Spaceship",
            ogDescription: "Spaceship - Multiply your fund with fun",
            ogImageUrl: "https://spaceship-sand.vercel.app/spaceship.png",
            castShareUrl: "https://spaceship-sand.vercel.app/plane.png",
            noindex: true,
        },
    });
}
