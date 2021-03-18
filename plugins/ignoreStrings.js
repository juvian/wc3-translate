const afterParse = async (output) => {
    delete output.script["하늘장이, 지나가던 나그네, 따해, S.C.V, 유토/레이무"];
    delete output.script["은방, 이즈무, 쩐사2, 믓시엘, 유맵포, 예비시인, WSPC_ES\n리아트리스\n조합 UI - 소찌 (개조 : 포로리님)\n"];
}

module.exports = {afterParse};

