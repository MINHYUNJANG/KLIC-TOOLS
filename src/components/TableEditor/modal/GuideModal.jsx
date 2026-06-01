import React from 'react';

const GuideModal = React.memo(({ onClose, layout, fadeStyle }) => (
    <div className={layout.modalPopWrap2} style={fadeStyle}>
        <div className={layout.modalPop2}>
            <div className={layout.titWrap2}>
                <h4 className="tit1" style={{ marginBottom: "0" }}>주의점</h4>
                <button onClick={onClose} className="btn_gr">닫기</button>
            </div>
            <div className={layout.modalCont}>
                <ul className="list_st1">
                    <li><span className="f_weightB">기본 사용법</span>은 가이드 <i className="ri-chat-unread-line"></i>을 눌러주세요</li>
                    <li>한글 문서에서 표를 올바른 서식으로 작성하지 않으면 깨지는 경우가 있습니다.</li>
                    <li>한글 전용 <span className='f_weightB'>Wingdings</span> 폰트는 웹에서 지원하지 않아 글자가 깨질 수 있습니다.</li>
                </ul>

                <h4 className="tit">리스트 &lt;ul&gt; 및 &lt;ol&gt; 적용 기준</h4>
                <ul className="list_st1">
                    <li>텍스트 앞에 기호(예: -, • 등)가 있는 경우 자동으로 리스트(ul)로 인식됩니다.<br />
                    <span className="bg_red">(일부 기호는 인식되지 않을 수 있습니다.)</span></li>
                    <li><span className="pc_red f_weightB">글자겹치기</span>로 만든 경우 인식 안됩니다.<span className='bg_red'>(정말 특수한 경우)</span></li>
                    <li>기본 기호 외 다른 기호를 사용하면 단계에 따라 list_st1 ~ list_st4 클래스가 자동 적용됩니다.</li>
                    <li>ul, ol 리스트가 표 안에 있을 경우, 해당 칸은 자동으로 왼쪽 정렬(al)됩니다.</li>
                    <li>단, (내용)이나 -처럼 괄호 안 숫자/문자만 단독으로 있는 경우에는 리스트로 변환되지 않습니다.</li>
                    <li>※,* 기호는 자동으로 bu_atte클래스로 변경됩니다.</li>
                </ul>
            </div>
        </div>
    </div>
));

GuideModal.displayName = "GuideModal";
export default GuideModal;
