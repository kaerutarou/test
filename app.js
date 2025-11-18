// ========================================
// グローバル変数
// ========================================
let quizzes = [];           // 問題データ配列
let shuffledQuizzes = [];   // シャッフル済み問題配列
let currentQuestionIndex = 0; // 現在の問題番号(0始まり)
let score = 0;              // 正解数
let selectedAnswer = null;  // 選択された回答のインデックス

// ========================================
// DOM要素の取得
// ========================================
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const errorScreen = document.getElementById('error-screen');

const questionNumber = document.getElementById('question-number');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const answerBtn = document.getElementById('answer-btn');
const feedback = document.getElementById('feedback');

const scoreText = document.getElementById('score-text');
const percentageText = document.getElementById('percentage-text');
const retryBtn = document.getElementById('retry-btn');

const errorMessage = document.getElementById('error-message');

// ========================================
// 初期化処理
// ========================================
async function init() {
    try {
        // 通常のJSONファイル読み込みを試す（http/httpsでの利用時）
        await loadQuizData();
        startWithQuizzes();
    } catch (error) {
        // 直開き(file://)や404時はここに来る → エラー画面でファイル選択による読込に誘導
        console.warn('問題データの自動読み込みに失敗しました。エラー画面に遷移します。', error);
        showError('問題データの読み込みに失敗しました。ローカルのJSONファイルを選択してください。');
    }
}

// ========================================
// クイズ開始共通処理
// ========================================
function startWithQuizzes() {
    // セッション用変数を初期化
    currentQuestionIndex = 0;
    score = 0;
    selectedAnswer = null;

    // 問題をシャッフルして1問目を表示
    shuffleQuizzes();
    displayQuestion();
}

// ========================================
// JSONデータ読み込み
// ========================================
async function loadQuizData() {
    try {
        const response = await fetch('data/quizzes.json');
        
        if (!response.ok) {
            throw new Error(`問題データの読み込みに失敗しました。(HTTPステータス: ${response.status})`);
        }
        
        const data = await response.json();
        
        // バリデーション
        if (!data.quizzes || !Array.isArray(data.quizzes)) {
            throw new Error('問題データの形式が不正です。quizzes配列が見つかりません。');
        }
        
        if (data.quizzes.length === 0) {
            throw new Error('問題データが空です。quizzes.jsonに問題を追加してください。');
        }
        
        // 各問題のバリデーション
        data.quizzes.forEach((quiz, index) => {
            if (!quiz.question || !quiz.options || !Array.isArray(quiz.options)) {
                throw new Error(`問題${index + 1}のデータが不正です。`);
            }
            if (quiz.options.length !== 4) {
                throw new Error(`問題${index + 1}の選択肢は4つである必要があります。`);
            }
            if (typeof quiz.correctAnswer !== 'number' || quiz.correctAnswer < 0 || quiz.correctAnswer > 3) {
                throw new Error(`問題${index + 1}のcorrectAnswerは0〜3の数値である必要があります。`);
            }
        });
        
        quizzes = data.quizzes;
        console.log(`問題データを読み込みました: ${quizzes.length}問`);
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        throw error;
    }
}

// （埋め込みJSON読み込みロジックは廃止）

// ========================================
// Fisher-Yatesシャッフルアルゴリズム
// ========================================
function shuffleQuizzes() {
    // 元の配列をコピー
    shuffledQuizzes = [...quizzes];
    
    // シャッフル
    for (let i = shuffledQuizzes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledQuizzes[i], shuffledQuizzes[j]] = [shuffledQuizzes[j], shuffledQuizzes[i]];
    }
    
    console.log('問題をシャッフルしました');
}

// ========================================
// 問題表示
// ========================================
function displayQuestion() {
    // 変数リセット
    selectedAnswer = null;
    feedback.classList.add('hidden');
    answerBtn.disabled = true;
    
    // 現在の問題を取得
    const currentQuiz = shuffledQuizzes[currentQuestionIndex];
    
    // 進捗表示
    questionNumber.textContent = `問題 ${currentQuestionIndex + 1}/${shuffledQuizzes.length}`;
    
    // 質問文表示
    questionText.textContent = currentQuiz.question;
    
    // 選択肢を表示
    displayOptions(currentQuiz.options);
    
    console.log(`問題${currentQuestionIndex + 1}を表示しました`);
}

// ========================================
// 選択肢表示
// ========================================
function displayOptions(options) {
    // 既存の選択肢をクリア
    optionsContainer.innerHTML = '';
    
    const labels = ['A', 'B', 'C', 'D'];
    
    options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.classList.add('option');
        optionDiv.dataset.index = index;
        
        optionDiv.innerHTML = `
            <span class="option-label">${labels[index]}.</span>
            <span class="option-text">${option}</span>
        `;
        
        // クリックイベント
        optionDiv.addEventListener('click', () => selectOption(index));
        
        optionsContainer.appendChild(optionDiv);
    });
}

// ========================================
// 選択肢選択
// ========================================
function selectOption(index) {
    selectedAnswer = index;
    
    // すべての選択肢からselectedクラスを削除
    const allOptions = document.querySelectorAll('.option');
    allOptions.forEach(option => {
        option.classList.remove('selected');
    });
    
    // 選択された選択肢にselectedクラスを追加
    const selectedOption = document.querySelector(`.option[data-index="${index}"]`);
    selectedOption.classList.add('selected');
    
    // 回答ボタンを有効化
    answerBtn.disabled = false;
    
    console.log(`選択肢${index}が選択されました`);
}

// ========================================
// 回答処理
// ========================================
function submitAnswer() {
    if (selectedAnswer === null) {
        return;
    }
    
    const currentQuiz = shuffledQuizzes[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuiz.correctAnswer;
    
    // 正解判定
    if (isCorrect) {
        score++;
        showFeedback(true);
        console.log('正解!');
    } else {
        showFeedback(false);
        console.log('不正解...');
    }
    
    // 選択肢の色を変更
    highlightAnswer(currentQuiz.correctAnswer, selectedAnswer);
    
    // 回答ボタンを無効化
    answerBtn.disabled = true;
    
    // 2秒後に次の問題へ
    setTimeout(() => {
        nextQuestion();
    }, 2000);
}

// ========================================
// フィードバック表示
// ========================================
function showFeedback(isCorrect) {
    feedback.classList.remove('hidden', 'correct', 'incorrect');
    
    if (isCorrect) {
        feedback.classList.add('correct');
        feedback.textContent = '✓ 正解です!';
    } else {
        feedback.classList.add('incorrect');
        feedback.textContent = '✗ 不正解です';
    }
}

// ========================================
// 正解・不正解のハイライト
// ========================================
function highlightAnswer(correctIndex, selectedIndex) {
    const allOptions = document.querySelectorAll('.option');
    
    // 正解の選択肢を緑色に
    allOptions[correctIndex].classList.remove('selected');
    allOptions[correctIndex].classList.add('correct');
    
    // 不正解の場合、選択した選択肢を赤色に
    if (correctIndex !== selectedIndex) {
        allOptions[selectedIndex].classList.remove('selected');
        allOptions[selectedIndex].classList.add('incorrect');
    }
    
    // すべての選択肢のクリックを無効化
    allOptions.forEach(option => {
        option.style.pointerEvents = 'none';
    });
}

// ========================================
// 次の問題へ
// ========================================
function nextQuestion() {
    currentQuestionIndex++;
    
    // すべての問題が終了したか確認
    if (currentQuestionIndex >= shuffledQuizzes.length) {
        showResult();
    } else {
        displayQuestion();
    }
}

// ========================================
// 結果画面表示
// ========================================
function showResult() {
    // 画面を切り替え
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    // スコア表示
    const totalQuestions = shuffledQuizzes.length;
    const percentage = Math.round((score / totalQuestions) * 100);
    
    scoreText.textContent = `${totalQuestions}問中 ${score}問正解`;
    percentageText.textContent = `正解率: ${percentage}%`;
    
    console.log(`結果: ${score}/${totalQuestions} (${percentage}%)`);
}

// ========================================
// 再挑戦
// ========================================
function retry() {
    // 変数をリセット
    currentQuestionIndex = 0;
    score = 0;
    selectedAnswer = null;
    
    // 問題を再シャッフル
    shuffleQuizzes();
    
    // 画面を切り替え
    resultScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    
    // 最初の問題を表示
    displayQuestion();
    
    console.log('再挑戦を開始しました');
}

// ========================================
// エラー画面表示
// ========================================
function showError(message) {
    quizScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    errorScreen.classList.remove('hidden');
    
    errorMessage.textContent = message;
    
    console.error('エラー:', message);
}

// ========================================
// イベントリスナー登録
// ========================================
answerBtn.addEventListener('click', submitAnswer);
retryBtn.addEventListener('click', retry);

// ローカルファイル選択からの読み込み
const fileInput = document.getElementById('file-input');
if (fileInput) {
    fileInput.addEventListener('change', onFileSelected);
}

function onFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const text = reader.result;
            const data = JSON.parse(text);
            if (!data.quizzes || !Array.isArray(data.quizzes) || data.quizzes.length === 0) {
                throw new Error('選択したJSONにquizzes配列が見つかりません。');
            }
            // バリデーション
            data.quizzes.forEach((quiz, index) => {
                if (!quiz.question || !quiz.options || !Array.isArray(quiz.options)) {
                    throw new Error(`(ファイル) 問題${index + 1}のデータが不正です。`);
                }
                if (quiz.options.length !== 4) {
                    throw new Error(`(ファイル) 問題${index + 1}の選択肢は4つである必要があります。`);
                }
                if (typeof quiz.correctAnswer !== 'number' || quiz.correctAnswer < 0 || quiz.correctAnswer > 3) {
                    throw new Error(`(ファイル) 問題${index + 1}のcorrectAnswerは0〜3の数値である必要があります。`);
                }
            });
            quizzes = data.quizzes;
            // エラー画面からクイズ画面へ切り替え
            errorScreen.classList.add('hidden');
            quizScreen.classList.remove('hidden');
            startWithQuizzes();
            console.log(`ローカルファイルから問題データを読み込みました: ${quizzes.length}問`);
        } catch (e) {
            errorMessage.textContent = 'JSONの読み込みに失敗しました: ' + e.message;
            console.error(e);
        }
    };
    reader.onerror = () => {
        errorMessage.textContent = 'ファイルの読み取りに失敗しました。別のファイルを試してください。';
    };
    reader.readAsText(file, 'UTF-8');
}

// ========================================
// アプリケーション起動
// ========================================
init();
