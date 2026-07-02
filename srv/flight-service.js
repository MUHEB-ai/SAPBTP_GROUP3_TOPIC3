const cds = require('@sap/cds');

module.exports = class FlightService extends cds.ApplicationService {
  async init() {
    const { AIAuditReports, CarrierClassification } = this.entities;

    this.on('analyzeDelay', async (req) => {
      const { airline, delayScenario } = req.data;
      const carrier = await SELECT.one.from(CarrierClassification).where({ Airline: airline });

      const prompt = buildDelayPrompt(airline, delayScenario, carrier);
      const aiResponse = await callLLAMA(prompt);

      await INSERT.into(AIAuditReports).entries({
        ID: cds.utils.uuid(),
        Airline: airline,
        ReliabilityTier: carrier?.ReliabilityTier || 'Unknown',
        DelayScenario: delayScenario,
        AIReasoning: aiResponse,
        RecoveryStrategy: ''
      });

      return aiResponse;
    });

    this.on('generateRecovery', async (req) => {
      const { airline, reliabilityTier, delayType } = req.data;
      const prompt = buildRecoveryPrompt(airline, reliabilityTier, delayType);
      return await callLLAMA(prompt);
    });

    await super.init();
  }
};

async function callLLAMA(prompt) {
  try {
    // SAP AI Core integration (activate when access is granted)
    // const { OrchestrationClient } = await import('@sap-ai-sdk/orchestration');
    // const client = new OrchestrationClient({
    //   llm: { model_name: 'meta--llama3-70b-instruct', model_params: { max_tokens: 1000, temperature: 0.3 } },
    //   templating: { template: [{ role: 'user', content: prompt }] }
    // });
    // const response = await client.chatCompletion();
    // return response.getContent();

    // Mock fallback for local development
    return generateMockResponse(prompt);
  } catch (error) {
    console.error('AI call failed:', error.message);
    return generateMockResponse(prompt);
  }
}

function generateMockResponse(prompt) {
  if (prompt.includes('ripple effect') || prompt.includes('DELAY SCENARIO')) {
    return `OPERATIONAL IMPACT ANALYSIS

1. DELAY PROPAGATION CHAIN
The reported delay will propagate through the aircraft's rotation chain, affecting an estimated 3-4 downstream flights over the next 6-8 hours. Each subsequent leg accumulates approximately 15-25 minutes of additional delay due to reduced turnaround buffer.

2. HUB CONNECTIVITY IMPACT
If the affected aircraft operates through a hub airport (ATL, ORD, DFW, DEN), the cascading effect is amplified. Approximately 12-18% of connecting passengers on downstream flights risk missing their connections, triggering rebooking costs of $200-400 per passenger.

3. CREW DUTY-TIME RISK
Extended delays beyond 90 minutes may push crew members toward their FAA duty-time limits (14 hours for domestic operations). If the crew times out, the airline must source a reserve crew, adding 2-4 hours of additional delay.

4. SEVERITY ASSESSMENT
Based on the carrier's reliability tier and historical patterns, this scenario has a HIGH probability of causing system-wide degradation if not addressed within the first rotation. Immediate intervention is recommended.`;
  }
  return `RECOVERY STRATEGY RECOMMENDATIONS

1. IMMEDIATE ACTIONS (Next 1-2 Hours)
- Extend the turnaround buffer by 30-45 minutes for the next 2 legs in the rotation
- Alert ground operations at the destination hub to prioritize gate assignment
- Pre-clear connecting passengers for rebooking on alternate flights

2. AIRCRAFT SWAP EVALUATION
- Check standby aircraft availability at the current station and the next hub
- An aircraft swap is cost-effective if the current delay exceeds 90 minutes and a standby aircraft can depart within 45 minutes

3. SCHEDULE BUFFER ADJUSTMENT
- For routes consistently showing delays in this time block, recommend adding 15-20 minutes of permanent schedule padding
- Focus buffer additions on the first departure of the rotation chain to prevent downstream propagation

4. PASSENGER PROTECTION
- Proactively rebook passengers with connections under 60 minutes at the hub
- Issue meal vouchers and status-appropriate compensation for delays exceeding 2 hours

5. ROOT CAUSE MITIGATION
- If the delay cause is Late Aircraft: address the upstream originating delay
- If Weather: monitor forecast windows and consider pre-emptive cancellation of low-load flights
- If Carrier (maintenance): review the aircraft's maintenance log for recurring issues`;
}

function buildDelayPrompt(airline, scenario, carrier) {
  const context = carrier
    ? `Carrier ${airline} is classified as "${carrier.ReliabilityTier}" tier with ${carrier.OnTimePct}% on-time rate, ${carrier.CancellationPct}% cancellation rate, and average arrival delay of ${carrier.AvgArrDelay} minutes.`
    : `Carrier ${airline} data not available.`;

  return `You are an airline operations control specialist analyzing U.S. domestic flight performance data.

CARRIER CONTEXT:
${context}

DELAY SCENARIO:
${scenario}

TASK: Analyze the ripple effects of this delay scenario. Consider:
1. How will this delay propagate through the aircraft's rotation chain?
2. Which downstream flights and connections are most at risk?
3. What is the estimated cascading delay impact over the next 6-12 hours?
4. How does this carrier's reliability tier affect the severity assessment?

Provide a structured operational analysis using aviation terminology (rotation, block time, hub connectivity, crew duty limits, minimum connection time).`;
}

function buildRecoveryPrompt(airline, reliabilityTier, delayType) {
  return `You are an airline recovery strategy specialist.

CARRIER: ${airline} (Reliability Tier: ${reliabilityTier})
DELAY TYPE: ${delayType}

Generate specific operational recovery recommendations:
1. IMMEDIATE ACTIONS: Steps to contain the delay in the next 1-2 hours
2. BUFFER ADJUSTMENTS: Recommended schedule padding for affected routes
3. AIRCRAFT SWAP OPTIONS: Criteria for evaluating standby aircraft deployment
4. CREW MANAGEMENT: Duty-time considerations and crew repositioning
5. PASSENGER IMPACT: Connection protection priorities and rebooking strategy

Ground your recommendations in the carrier's "${reliabilityTier}" performance tier.`;
}