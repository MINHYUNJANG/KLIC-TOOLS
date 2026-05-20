import React, { createContext, useContext, useReducer, useMemo } from "react";

const initialConfig = {
    wrapperClassName: 'tbl_st',
    ulClassName: 'list_st',
    olType: [],
    keepMarker: false,
    tableUlClassName: 'list_st',
    tableOlType: [],
    tableKeepMarker: false,
    tableType: 'default',
    isColorMode: false,
    isColorClassMode: true,
    tableIsColorMode: false,
    tableIsColorClassMode: true,
    isWrapDiv: true,
    isVerticalHeader: false,
    isMergeTables: false,
    headerRows: 1,
    headerCols: 1,
    tit1: { type: 'custom', val: '' },
    tit2: { type: 'custom', val: '' },
    tit3: { type: 'custom', val: '' },
    tit1Class: 'tit1',
    tit2Class: 'tit2',
    tit3Class: 'tit3',
};

function configReducer(state, action) {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.key]: action.value };
        case 'UPDATE_MULTIPLE':
            return { ...state, ...action.payload };
        case 'SET_TABLE_TYPE':
            return { ...state, tableType: action.value, headerRows: 1, headerCols: 1 };
        default:
            return state;
    }
}

const TableConfigStateContext = createContext();
const TableConfigDispatchContext = createContext();

export function TableConfigProvider({ children }) {
    const [config, dispatchConfig] = useReducer(configReducer, initialConfig);

    const dispatchers = useMemo(() => ({
        updateConfig: (key, value) => dispatchConfig({ type: 'SET_FIELD', key, value }),
        updateMultipleConfig: (payload) => dispatchConfig({ type: 'UPDATE_MULTIPLE', payload }),
        handleTableTypeChange: (type) => dispatchConfig({ type: 'SET_TABLE_TYPE', value: type }),
    }), []);

    return (
        <TableConfigDispatchContext.Provider value={dispatchers}>
            <TableConfigStateContext.Provider value={config}>
                {children}
            </TableConfigStateContext.Provider>
        </TableConfigDispatchContext.Provider>
    );
}

export function useTableConfig() {
    return useContext(TableConfigStateContext);
}

export function useTableConfigDispatch() {
    return useContext(TableConfigDispatchContext);
}
