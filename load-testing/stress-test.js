import http from "k6/http";
import { sleep, check, group } from "k6";
import { payload1 } from "./classification-payloads.js";
import { apiBaseUrl, apiDefaultHeaders } from "./api-config.js";
import { tagWithCurrentStageIndex } from "https://jslib.k6.io/k6-utils/1.3.0/index.js";

export const options = {
  stages: [
    // Initial stage => Rampup to 5 users
    {
      duration: "10s",
      target: 5,
    },
    // Flat
    {
      duration: "10m",
      target: 5,
    },

    // Spike up to 500
    {
      duration: "30s",
      target: 500,
    },
    // Flat
    {
      duration: "20m",
      target: 500,
    },
  ],
};

export default function () {
  tagWithCurrentStageIndex();

  const submittedClassificationJobs = new Map();
  submit(payload1, submittedClassificationJobs);

  sleep(60);
  updateClassificationStatuses(submittedClassificationJobs);

  // Submit another job 2 minutes after first one
  submit(payload1, submittedClassificationJobs);
  updateClassificationStatuses(submittedClassificationJobs);
  sleep(60);

  // Fetch status every minutes until all done
  do {
    sleep(60);
    updateClassificationStatuses(submittedClassificationJobs);
  } while (
    Array.from(submittedClassificationJobs.values()).filter(isRunning)
      .length === 0
  );
}

function updateClassificationStatuses(submittedClassificationJobs) {
  group("updateClassificationStatuses", () => {
    const runningJobIds = Array.from(submittedClassificationJobs.entries())
      .filter(([id, status]) => isRunning(status))
      .map(([id, status]) => id);
    const tags = { type: "updateClassificationStatuses" };
    for (const classificationJobId of runningJobIds) {
      const classificationResponse = http.get(
        `${apiBaseUrl}/classification/${classificationJobId}`,
        { headers: apiDefaultHeaders, tags },
      );
      check(classificationResponse, {
        "status is 200": (res) => res.status === 200,
      });
      check(classificationResponse, {
        "valid json": (res) => isValidJson(res.body),
      });
      try {
        const classificationResult = JSON.parse(classificationResponse.body);

        submittedClassificationJobs.set(
          classificationJobId,
          classificationResult.status,
        );
      } catch (e) {}
    }
  });
}

function isValidJson(body) {
  try {
    JSON.parse(body);
    return true;
  } catch (e) {
    return false;
  }
}

function isRunning(status) {
  return status === "SUBMITTED" || status === "IN_PROGRESS";
}

function submit(payload, runningClassificationJobs) {
  group("submit", () => {
    const submitResponse = http.post(
      `${apiBaseUrl}/classification`,
      JSON.stringify(payload),
      {
        headers: apiDefaultHeaders,
      },
    );
    check(submitResponse, { "status is 200": (res) => res.status === 200 });
    check(submitResponse, {
      "valid json": (res) => isValidJson(res.body),
    });
    try {
      const classificationJobId = JSON.parse(submitResponse.body).job_id;
      runningClassificationJobs.set(classificationJobId, "SUBMITTED");
    } catch (e) {}
  });
}
