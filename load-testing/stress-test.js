import http from "k6/http";
import { sleep, check, group, fail } from "k6";
import { payload1 } from "./classification-payloads.js";
import { apiBaseUrl, apiDefaultHeaders } from "./api-config.js";
import { tagWithCurrentStageIndex } from "https://jslib.k6.io/k6-utils/1.6.0/index.js";

const spikeDuration = "1m";
const stableDuration= "19m";
const vuLevels = [10, 100, 200];
//const vuLevels = [10, 100, 200, 500];

const stages= vuLevels.flatMap( level => ([
    {
     // SPike up
      duration: spikeDuration,
      target: level,
    },
    {
      // Stable 
      duration: stableDuration,
      target: level,
    },
    ]));

export const options = {
  vus: vuLevels[0],
  stages: stages
};

export default function () {
  tagWithCurrentStageIndex();
  const submittedClassificationJobs = new Map();
  submit(payload1, submittedClassificationJobs);

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
    if (classificationResponse.status === 200) {
      const classificationResult = JSON.parse(classificationResponse.body);

      submittedClassificationJobs.set(
        classificationJobId,
        classificationResult.status,
      );
    } 
  }
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
    if (submitResponse.status !== 200) {
      fail("submit failed");
    } else {
      const classificationJobId = JSON.parse(submitResponse.body).job_id;
      runningClassificationJobs.set(classificationJobId, "SUBMITTED");
    }
}
