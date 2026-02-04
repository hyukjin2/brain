%% ==============================================================
%  그룹·레스트별 <group>_<rest>.mu (Nx28) 읽어 h(1~7), j(8~28) 시각화
%  - 폴더 구조: <base>/<group>/<group>_<rest>.mat  (1순위)
%               <base>/<group>_<rest>.mat          (대체 탐색)
%  - MAT 내부 변수: <group>_<rest> (1x1 struct), 필드: mu( Nx x 28 )
%  - 각 rest마다 파라미터를 4개씩 묶어서(2x2) figure 생성
%    (A) h: boxplot + scatter
%    (B) j: boxplot + scatter
%  - 엑셀(sig) 정보는 사용하지 않음
% ==============================================================

clear; clc;

%% ===== 사용자 설정 =====
base_dir = pwd;  % 필요시 절대경로 지정

% 그룹/레스트 목록 (group7 제외 예시)
group_list  = {'group1','group2','group3','group4','group5','group6','group4567','group567'};
rests       = {'rest1','rest2'};

% ★ 네트워크 이름 (ROI 1~7 순서대로)
net_names = {'Cont','Default','DorsAttn','Limbic','SalVentAttn','SomMot','Vis'};

% 그림 저장 옵션
save_fig = true;   % true → PNG 저장
out_dir  = fullfile(base_dir, 'fig_box_scatter');
if save_fig && ~exist(out_dir, 'dir'), mkdir(out_dir); end

% 시각화 옵션
jitter_sd = 0.05;   % 도트 x축 지터
fs_label  = 10;     % 축 폰트
fs_title  = 12;     % 타이틀 폰트

% 파라미터 묶음 크기(한 figure당 파라미터 개수)
chunk_size = 4;     % 4개씩 (2x2 타일)

%% ===== 데이터 적재 =====
data = struct();
for r = 1:numel(rests)
    rest = rests{r};
    H = cell(1, numel(group_list));  % 각 그룹의 h(?,7)
    J = cell(1, numel(group_list));  % 각 그룹의 j(?,21)

    for gi = 1:numel(group_list)
        gname = group_list{gi};
        % 1) 기본 경로: <base>/<group>/<group>_<rest>.mat
        f1 = fullfile(base_dir, gname, sprintf('%s_%s.mat', gname, rest));
        % 2) 대체 경로(루트): <base>/<group>_<rest>.mat
        f2 = fullfile(base_dir, sprintf('%s_%s.mat', gname, rest));

        MU = safe_load_mu(f1, gname, rest);
        if isempty(MU)
            MU = safe_load_mu(f2, gname, rest);
        end
        if isempty(MU)
            fprintf('[WARN] 파일/변수 없음: %s | %s\n', f1, f2);
            H{gi} = []; J{gi} = [];
            continue;
        end
        if size(MU,2) ~= 28
            fprintf('[WARN] mu 열이 28이 아님(%d): %s 또는 %s\n', size(MU,2), f1, f2);
            H{gi} = []; J{gi} = [];
            continue;
        end
        H{gi} = MU(:, 1:7);   % h1~h7
        J{gi} = MU(:, 8:28);  % j1~j21
    end

    data.(rest).H = H;
    data.(rest).J = J;
end

%% ===== 시각화 (boxplot + scatter만) =====
for r = 1:numel(rests)
    rest = rests{r};
    H = data.(rest).H;
    J = data.(rest).J;

    %% --- h: boxplot + scatter, 4개씩 묶어서 ---
    for h_start = 1:chunk_size:7
        h_end = min(h_start+chunk_size-1, 7);
        figure('Name', sprintf('%s: h (box+dot) %d-%d', rest, h_start, h_end), 'Color','w');
        tl = tiledlayout(2,2,'Padding','compact','TileSpacing','compact');
        title(tl, sprintf('%s — h_{%d..%d} (boxplot + scatter)', rest, h_start, h_end), ...
            'FontSize', fs_title, 'FontWeight','bold');

        for h_idx = h_start:h_end
            nexttile;
            param_by_group = cell(1, numel(H));
            for gi = 1:numel(H)
                if isempty(H{gi}), param_by_group{gi} = [];
                else, param_by_group{gi} = H{gi}(:, h_idx);
                end
            end
            % ★ h 제목: h_k (네트워크이름)
            if h_idx <= numel(net_names)
                h_title = sprintf('h_%d (%s)', h_idx, net_names{h_idx});
            else
                h_title = sprintf('h_%d', h_idx);
            end
            plot_grouped_box_scatter(param_by_group, group_list, h_title, fs_label, jitter_sd);
        end
        % 남는 타일 비우기
        for k = (h_end-h_start+2):4
            nexttile; axis off;
        end

        if save_fig
            fname = sprintf('%s_h_box+scatter_%d-%d.png', rest, h_start, h_end);
            exportgraphics(tl, fullfile(out_dir, fname), 'Resolution', 200);
        end
    end

    %% --- j: boxplot + scatter, 4개씩 묶어서 ---
    for j_start = 1:chunk_size:21
        j_end = min(j_start+chunk_size-1, 21);
        figure('Name', sprintf('%s: j (box+dot) %d-%d', rest, j_start, j_end), 'Color','w');
        tl = tiledlayout(2,2,'Padding','compact','TileSpacing','compact');
        title(tl, sprintf('%s — j_{%d..%d} (boxplot + scatter)', rest, j_start, j_end), ...
            'FontSize', fs_title, 'FontWeight','bold');

        for j_idx = j_start:j_end
            nexttile;
            param_by_group = cell(1, numel(J));
            for gi = 1:numel(J)
                if isempty(J{gi}), param_by_group{gi} = [];
                else, param_by_group{gi} = J{gi}(:, j_idx);
                end
            end

            % ★ j 제목: j_k (네트워크A - 네트워크B)
            [i_net, j_net] = j_index_to_pair(j_idx, numel(net_names));   % (i<j 인덱스)
            if i_net <= numel(net_names) && j_net <= numel(net_names)
                j_title = sprintf('j_%d (%s - %s)', ...
                                  j_idx, net_names{i_net}, net_names{j_net});
            else
                j_title = sprintf('j_%d', j_idx);
            end

            plot_grouped_box_scatter(param_by_group, group_list, j_title, fs_label, jitter_sd);
        end
        % 남는 타일 비우기
        for k = (j_end-j_start+2):4
            nexttile; axis off;
        end

        if save_fig
            fname = sprintf('%s_j_box+scatter_%d-%d.png', rest, j_start, j_end);
            exportgraphics(tl, fullfile(out_dir, fname), 'Resolution', 200);
        end
    end
end

%% =======================
% ===== 로컬 함수들 =====
% =======================

function MU = safe_load_mu(mat_path, gname, rest)
% <mat_path>에서 변수 <gname>_<rest> 구조체를 찾아 그 안의 .mu (Nx28) 반환
% 없거나 규격 불일치면 [] 반환
    MU = [];
    if ~isfile(mat_path), return; end
    try
        S = load(mat_path);
    catch
        return;
    end
    varname = sprintf('%s_%s', gname, rest);
    if isfield(S, varname)
        V = S.(varname);
        if isstruct(V) && isfield(V,'mu') && isnumeric(V.mu) && ismatrix(V.mu)
            MU = V.mu;
            return;
        end
    end
    % 폴백: 파일 안의 어떤 struct라도 .mu(?,28) 있으면 채택
    fns = fieldnames(S);
    for k = 1:numel(fns)
        V = S.(fns{k});
        if isstruct(V) && isfield(V,'mu') && isnumeric(V.mu) && ismatrix(V.mu) && size(V.mu,2)==28
            MU = V.mu;
            return;
        end
        if isnumeric(V) && ismatrix(V) && size(V,2)==28
            MU = V;  % mu 자체가 바로 저장된 경우
            return;
        end
    end
end

function plot_grouped_box_scatter(param_by_group, group_names, title_str, fs_label, jitter_sd)
    % 그룹별 boxplot + scatter overlay
    G = numel(group_names);
    y_all = []; g_all = [];

    % ----- 전체 데이터 모으기 -----
    for gi = 1:G
        y = param_by_group{gi};
        if isempty(y), continue; end
        y_all = [y_all; y(:)];
        g_all = [g_all; repmat(gi, numel(y), 1)];
    end

    if isempty(y_all)
        text(0.5,0.5,'(no data)','HorizontalAlignment','center');
        axis off;
        return;
    end

    colors = lines(G);
    hold on;

    % ----- Boxplot -----
    boxplot(y_all, g_all, ...
        'Labels', group_names, ...
        'Symbol','k.', 'Whisker',1.5, 'Widths',0.6, 'Colors','k');

    % 박스 색 채우기
    h = findobj(gca,'Tag','Box');
    for j = 1:length(h)
        patch(get(h(j),'XData'), get(h(j),'YData'), colors(length(h)-j+1,:), ...
              'FaceAlpha',0.3, 'EdgeColor','none');
    end

    % ----- Scatter overlay -----
    for gi = 1:G
        y = param_by_group{gi};
        if isempty(y), continue; end

        % 지터를 준 x 위치
        x = gi + randn(size(y)) * jitter_sd;

        scatter(x, y, ...
            12, colors(gi,:), ...
            'filled', ...
            'MarkerFaceAlpha', 0.6, ...
            'MarkerEdgeAlpha', 0.0);
    end

    set(gca,'FontSize',fs_label);
    xtickangle(30);
    ylabel('value');
    title(title_str, 'FontSize', fs_label, 'Interpreter','none');
    grid on; box on;

    % y축을 데이터 중심으로 타이트하게 조정
    all_y_min = min(y_all);
    all_y_max = max(y_all);
    padding = 0.1 * (all_y_max - all_y_min);  % 위아래 10% 여유
    if padding == 0
        padding = 0.05;
    end
    ylim([all_y_min - padding, all_y_max + padding]);
end

function [i, j] = j_index_to_pair(j_idx, d)
% j_idx (1~d(d-1)/2)를 (i,j) 쌍(i<j)로 변환
% 여기서는 d=7 이고, vech(J) 순서는
% (1,2),(1,3),...,(1,7),(2,3),...,(2,7),...,(6,7)
    idx = 0;
    for col = 1:d
        for row = col+1:d
            idx = idx + 1;
            if idx == j_idx
                i = col;
                j = row;
                return;
            end
        end
    end
    error('j_index_to_pair: invalid j_idx %d for d=%d', j_idx, d);
end
