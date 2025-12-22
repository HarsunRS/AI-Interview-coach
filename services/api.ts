export async function initInterview(profile: any) {
  const res = await fetch("https://ai-mock-interviewer-cu6i.onrender.com/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userMessage: "Start interview", profile }),
  });

  return await res.json();
}

export async function sendInterviewMsg(message: string) {
  const res = await fetch("https://ai-mock-interviewer-cu6i.onrender.com/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userMessage: message }),
  });

  return await res.json();
}
