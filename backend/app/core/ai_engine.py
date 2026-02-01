import asyncio
import os
import google.generativeai as genai
from openai import OpenAI, AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import Device
from app.core.config import settings

# Configure Google GenAI
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

class AISentinel:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.gemini_model = genai.GenerativeModel("gemini-flash-latest") if settings.GEMINI_API_KEY else None
        
        # Initialize OpenAI (ChatGPT)
        self.openai_client = None
        if settings.OPENAI_API_KEY:
             self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def answer_user_query(self, query: str, provider: str = "gemini"):
        """
        Handles queries using either Gemini or ChatGPT based on provider selection.
        """
        # 1. Fetch Context
        result = await self.db.execute(select(Device))
        devices = result.scalars().all()
        
        context_list = []
        for d in devices[:50]:
            vendor = d.meta.get('vendor', 'Unknown') if d.meta else 'Unknown'
            ports = d.meta.get('ports', []) if d.meta else []
            context_list.append(f"- IP: {d.ip_address} | Host: {d.hostname} | Vendor: {vendor} | Role: {d.role} | OS: {d.os_type} | Ports: {ports}")
        
        context_str = "\n".join(context_list) if context_list else "No devices discovered yet."

        system_prompt = f"""
        You are Sentinel, a standard-based Network Security AI.
        
        CONTEXT [Known Network Devices]:
        {context_str}

        USER REQUEST: "{query}"

        INSTRUCTIONS:
        1. PRIORITIZE the USER REQUEST above all else. Use the device context only if relevant to the specific question.
        2. If analyzing a specific PACKET, focus strictly on the packet's headers, payload (hex/ascii), and potential security implications.
        3. Do NOT mention cameras, IoT devices, or topology unless they are directly involved in the source/destination of the traffic.
        4. Be direct. Avoid generic disclaimers. Give a concrete verdict (Malicious, Benign, or Suspicious).
        """

        try:
            # --- OPTION A: CHATGPT (OpenAI) ---
            if provider == "openai":
                if not self.openai_client:
                    return "⚠️ OpenAI API Key is missing. Please check settings."
                
                response = await self.openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a cybersecurity expert analyzing network data."},
                        {"role": "user", "content": system_prompt}
                    ],
                    max_tokens=500
                )
                return response.choices[0].message.content

            # --- OPTION B: GEMINI (Default) ---
            else:
                if not self.gemini_model:
                     return "⚠️ Gemini API Key is missing. Please check settings."
                
                loop = asyncio.get_running_loop()
                response = await loop.run_in_executor(
                    None, 
                    lambda: self.gemini_model.generate_content(system_prompt)
                )
                return response.text

        except Exception as e:
            return f"⚠️ AI Error ({provider}): {str(e)}"
