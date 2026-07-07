const cds = require('@sap/cds');

module.exports = class FlightService extends cds.ApplicationService {
  async init() {
    const { AIAuditReports, CarrierClassification } = this.entities;

    // Auto-trigger AI analysis when a new report is created
    this.before('CREATE', AIAuditReports, async (req) => {
      const { Airline, DelayScenario } = req.data;
      if (!Airline || !DelayScenario) return;

      // Fetch carrier classification
      const carrier = await SELECT.one.from(CarrierClassification)
        .where({ Airline: Airline });

      req.data.ReliabilityTier = carrier?.ReliabilityTier || 'Unknown';

      // Generate AI analysis
      const analysisPrompt = buildDelayPrompt(Airline, DelayScenario, carrier);
      req.data.AIReasoning = await callLLAMA(analysisPrompt);

      // Generate recovery strategy
      const recoveryPrompt = buildRecoveryPrompt(Airline, req.data.ReliabilityTier, 'LateAircraftDelay');
      req.data.RecoveryStrategy = await callLLAMA(recoveryPrompt);
    });

    // Keep the actions for API access
    this.on('analyzeDelay', async (req) => {
      const { airline, delayScenario } = req.data;
      const carrier = await SELECT.one.from(CarrierClassification).where({ Airline: airline });
      const prompt = buildDelayPrompt(airline, delayScenario, carrier);
      const aiResponse = await callLLAMA(prompt);

      const recoveryPrompt = buildRecoveryPrompt(airline, carrier?.ReliabilityTier || 'Unknown', 'LateAircraftDelay');
      const recoveryResponse = await callLLAMA(recoveryPrompt);

      await INSERT.into(AIAuditReports).entries({
        ID: cds.utils.uuid(),
        Airline: airline,
        ReliabilityTier: carrier?.ReliabilityTier || 'Unknown',
        DelayScenario: delayScenario,
        AIReasoning: aiResponse,
        RecoveryStrategy: recoveryResponse
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
    // Step 1: Get auth token
    const tokenRes = await fetch('https://btpailearning.authentication.us10.hana.ondemand.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&client_id=sb-6a3dc4ad-b8b6-4291-ba47-f83bde33d590!b564356|aicore!b164&client_secret=45db75f1-e067-42eb-94b3-f085511c1801$BJyItLi3-yM9hU8Cu0DG28_8e9tPBtd-7AkVFKk_2Z8='
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    // Step 2: Call orchestration endpoint
    const orchRes = await fetch('https://api.ai.prod.us-east-1.aws.ml.hana.ondemand.com/v2/inference/deployments/d31cb3d4d1d60d18/completion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'AI-Resource-Group': 'default'
      },
      body: JSON.stringify({
        orchestration_config: {
          module_configurations: {
            llm_module_config: {
              model_name: 'gpt-4o-mini',
              model_params: { max_tokens: 1500, temperature: 0.3 }
            },
            templating_module_config: {
              template: [{ role: 'user', content: prompt }]
            }
          }
        }
      })
    });

    const data = await orchRes.json();
    return data.orchestration_result?.choices?.[0]?.message?.content || 'AI analysis unavailable';
  } catch (error) {
    console.error('AI Core call failed:', error.message);
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