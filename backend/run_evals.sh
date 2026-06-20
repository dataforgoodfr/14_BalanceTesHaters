#!/bin/bash
export NOCODB_ANNOTATION_TABLE_ID=m5t7qqaer2oa441
export PYTHONPATH=$PYTHONPATH:.

PROMPT_NAIF="balanceteshaters/scripts/binary_classification_prompt_naif.txt"
PROMPT_COMPLET="balanceteshaters/scripts/binary_classification_prompt_complet.txt"

LOG_FILE="evaluation_run.log"
echo "Starting evaluations at $(date)" > $LOG_FILE

run_eval() {
    local model=$1
    local prompt=$2
    local prompt_name=$(basename "$prompt" .txt)
    
    echo "-------------------------------------------" >> $LOG_FILE
    echo "Running: Model=$model, Prompt=$prompt_name" >> $LOG_FILE
    echo "Start: $(date)" >> $LOG_FILE
    
    uv run python balanceteshaters/scripts/experimentation_classification.py --model "$model" --backend ollama --prompt-file "$prompt" >> $LOG_FILE 2>&1
    
    # Identify the generated file (predictions_{table}_{model}_{prompt_name}.csv)
    # Model name in file has special characters replaced by _ in the script
    local model_file_name=$(echo "$model" | sed 's/[^A-Za-z0-9._-]/_/g')
    local csv_file="balanceteshaters/data/predictions_m5t7qqaer2oa441_${model_file_name}_${prompt_name}.csv"
    
    if [ -f "$csv_file" ]; then
        uv run python balanceteshaters/scripts/evaluate_classification.py "$csv_file" --prompt-file "$prompt" >> $LOG_FILE 2>&1
    else
        echo "Error: CSV file not found $csv_file" >> $LOG_FILE
    fi
    
    echo "End: $(date)" >> $LOG_FILE
}

# 1. Gemma 4 e2b - Naif (already done, skip)
# run_eval "gemma4:e2b" "$PROMPT_NAIF"

# 2. Gemma 4 e2b - Complet (already done, skip)
# run_eval "gemma4:e2b" "$PROMPT_COMPLET"

# 3. Qwen 3.5 2B - Naif
run_eval "qwen3.5:2B" "$PROMPT_NAIF"

# 4. Qwen 3.5 2B - Complet
run_eval "qwen3.5:2B" "$PROMPT_COMPLET"

# 5. Qwen 3 1.7b - Naif
run_eval "qwen3:1.7b" "$PROMPT_NAIF"

# 6. Qwen 3 1.7b - Complet
run_eval "qwen3:1.7b" "$PROMPT_COMPLET"

echo "All evaluations finished at $(date)" >> $LOG_FILE
