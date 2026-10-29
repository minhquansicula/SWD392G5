import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/status_badge.dart';
import '../models/password_link_model.dart';
import '../providers/auth_provider.dart';

class ForgotPasswordScreen extends StatefulWidget {
  final String? prefilledEmail;
  final String? initialToken;
  final int initialTabIndex;
  final bool isFromProfile;

  const ForgotPasswordScreen({
    super.key,
    this.prefilledEmail,
    this.initialToken,
    this.initialTabIndex = 0,
    this.isFromProfile = false,
  });

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Tab 1: Request Reset Link
  final _emailController = TextEditingController();
  bool _isSendingEmail = false;
  String? _sendEmailSuccessMessage;
  String? _sendEmailErrorMessage;

  // Tab 2: Set New Password
  final _tokenController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isCheckingToken = false;
  PasswordLinkInfoModel? _verifiedLinkInfo;
  String? _tokenError;

  bool _obscureNewPass = true;
  bool _obscureConfirmPass = true;
  bool _isSubmittingNewPass = false;
  String? _setPasswordError;
  bool _isSuccessCompleted = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTabIndex.clamp(0, 1),
    );

    if (widget.prefilledEmail != null) {
      _emailController.text = widget.prefilledEmail!;
    }

    if (widget.initialToken != null && widget.initialToken!.isNotEmpty) {
      _tokenController.text = widget.initialToken!;
      _tabController.index = 1;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _validateToken();
      });
    }

    _newPasswordController.addListener(() {
      setState(() {});
    });
    _confirmPasswordController.addListener(() {
      setState(() {});
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailController.dispose();
    _tokenController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  // --- ACTIONS TAB 1: Gửi yêu cầu link ---
  Future<void> _handleSendResetLink() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      setState(() {
        _sendEmailErrorMessage = 'Vui lòng nhập địa chỉ Email tài khoản của bạn';
        _sendEmailSuccessMessage = null;
      });
      return;
    }

    setState(() {
      _isSendingEmail = true;
      _sendEmailErrorMessage = null;
      _sendEmailSuccessMessage = null;
    });

    final auth = context.read<AuthProvider>();
    final res = await auth.requestForgotPassword(email);

    if (!mounted) return;

    setState(() {
      _isSendingEmail = false;
    });

    if (res.success) {
      setState(() {
        _sendEmailSuccessMessage =
            'Đã gửi liên kết đặt lại mật khẩu! Nếu email "$email" thuộc về một tài khoản hợp lệ trên hệ thống AIVES, bạn sẽ nhận được hướng dẫn và mã Token trong hộp thư đến (hoặc hòm thư Spam).';
        _sendEmailErrorMessage = null;
      });
    } else {
      setState(() {
        _sendEmailErrorMessage = res.message.isNotEmpty
            ? res.message
            : 'Không thể gửi email. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.';
      });
    }
  }

  // --- ACTIONS TAB 2: Kiểm tra Token ---
  Future<void> _validateToken() async {
    final rawInput = _tokenController.text.trim();
    final cleanToken = PasswordPolicyUtils.extractToken(rawInput);

    if (cleanToken.isEmpty) {
      setState(() {
        _tokenError = 'Vui lòng nhập hoặc dán mã Token từ email';
        _verifiedLinkInfo = null;
      });
      return;
    }

    // Update text controller if full URL was pasted
    if (cleanToken != rawInput) {
      _tokenController.text = cleanToken;
    }

    setState(() {
      _isCheckingToken = true;
      _tokenError = null;
      _verifiedLinkInfo = null;
      _setPasswordError = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final linkInfo = await auth.checkPasswordLink(cleanToken);

      if (!mounted) return;

      setState(() {
        _isCheckingToken = false;
        _verifiedLinkInfo = linkInfo;
        _tokenError = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isCheckingToken = false;
        _verifiedLinkInfo = null;
        _tokenError = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _pasteFromClipboard() async {
    final data = await Clipboard.getData('text/plain');
    if (data?.text != null && data!.text!.trim().isNotEmpty) {
      final extracted = PasswordPolicyUtils.extractToken(data.text!.trim());
      _tokenController.text = extracted;
      _validateToken();
    }
  }

  // --- ACTIONS TAB 2: Đặt mật khẩu mới ---
  Future<void> _handleSetPassword() async {
    final token = PasswordPolicyUtils.extractToken(_tokenController.text);
    final newPass = _newPasswordController.text;
    final confirmPass = _confirmPasswordController.text;

    if (token.isEmpty) {
      setState(() => _setPasswordError = 'Vui lòng nhập mã Token hợp lệ');
      return;
    }

    final eval = PasswordPolicyUtils.evaluatePassword(newPass);
    if (!eval.isValid) {
      setState(() => _setPasswordError = eval.errorMessage);
      return;
    }

    if (newPass != confirmPass) {
      setState(() => _setPasswordError = 'Mật khẩu nhập lại không khớp');
      return;
    }

    setState(() {
      _isSubmittingNewPass = true;
      _setPasswordError = null;
    });

    final auth = context.read<AuthProvider>();
    final res = await auth.setPasswordWithToken(
      rawInput: token,
      newPassword: newPass,
    );

    if (!mounted) return;

    setState(() {
      _isSubmittingNewPass = false;
    });

    if (res.success) {
      setState(() {
        _isSuccessCompleted = true;
      });
    } else {
      setState(() {
        _setPasswordError = res.message.isNotEmpty
            ? res.message
            : 'Không thể đặt lại mật khẩu. Link có thể đã hết hạn hoặc không hợp lệ.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          widget.isFromProfile ? 'Đổi & Cập Nhật Mật Khẩu' : 'Khôi Phục Mật Khẩu',
          style: AppTextStyles.headlineMd.copyWith(fontSize: 18),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Stack(
        children: [
          // Ambient Glow Background
          Positioned(
            top: -60,
            left: -40,
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withValues(alpha: 0.18),
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.secondary.withValues(alpha: 0.14),
              ),
            ),
          ),

          SafeArea(
            child: _isSuccessCompleted
                ? _buildSuccessView()
                : Column(
                    children: [
                      const SizedBox(height: 8),
                      // Custom Tab Selector
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceCardHigh,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.borderGlass),
                          ),
                          child: TabBar(
                            controller: _tabController,
                            indicator: BoxDecoration(
                              gradient: AppColors.primaryGradient,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primary.withValues(alpha: 0.35),
                                  blurRadius: 10,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            labelColor: Colors.white,
                            unselectedLabelColor: AppColors.textMuted,
                            labelStyle: AppTextStyles.labelBold.copyWith(fontSize: 12),
                            unselectedLabelStyle: AppTextStyles.labelSm.copyWith(fontSize: 12),
                            dividerColor: Colors.transparent,
                            tabs: const [
                              Tab(
                                icon: Icon(Icons.mark_email_read_rounded, size: 18),
                                text: '1. Gửi Link Email',
                              ),
                              Tab(
                                icon: Icon(Icons.lock_reset_rounded, size: 18),
                                text: '2. Đặt Lại Mật Khẩu',
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      Expanded(
                        child: TabBarView(
                          controller: _tabController,
                          children: [
                            _buildTabRequestReset(),
                            _buildTabSetNewPassword(),
                          ],
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 1: YÊU CẦU LINK GỬI QUA EMAIL
  // ==========================================
  Widget _buildTabRequestReset() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          GlassCard(
            padding: const EdgeInsets.all(22),
            borderRadius: 22,
            border: Border.all(color: AppColors.borderGlass),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.alternate_email_rounded,
                          color: AppColors.primaryLight, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Quên mật khẩu đăng nhập?',
                            style: AppTextStyles.headlineMd.copyWith(fontSize: 16),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Hệ thống sẽ gửi link một lần đến email của bạn',
                            style: AppTextStyles.bodySm
                                .copyWith(color: AppColors.textMuted, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                Text(
                  'Email FPT hoặc Email Tài Khoản',
                  style: AppTextStyles.labelBold.copyWith(fontSize: 12),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  style: AppTextStyles.bodyMd.copyWith(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'ví dụ: student@fpt.edu.vn',
                    prefixIcon: const Icon(Icons.email_outlined,
                        color: AppColors.primaryLight, size: 20),
                    suffixIcon: _emailController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded,
                                size: 18, color: AppColors.textMuted),
                            onPressed: () {
                              _emailController.clear();
                              setState(() {});
                            },
                          )
                        : null,
                  ),
                ),

                const SizedBox(height: 16),

                // Error alert
                if (_sendEmailErrorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: AppColors.danger.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.error_outline_rounded,
                            color: AppColors.danger, size: 18),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _sendEmailErrorMessage!,
                            style: AppTextStyles.bodySm
                                .copyWith(color: AppColors.danger, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Success alert
                if (_sendEmailSuccessMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                          color: AppColors.success.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.check_circle_rounded,
                                color: AppColors.success, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              'Đã gửi yêu cầu thành công',
                              style: AppTextStyles.labelBold.copyWith(
                                color: AppColors.success,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _sendEmailSuccessMessage!,
                          style: AppTextStyles.bodySm.copyWith(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 12),
                        InkWell(
                          onTap: () {
                            _tabController.animateTo(1);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Chuyển sang Bước 2: Đặt Lại Mật Khẩu',
                                  style: AppTextStyles.labelBold.copyWith(
                                    color: Colors.white,
                                    fontSize: 12,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Icon(Icons.arrow_forward_rounded,
                                    color: Colors.white, size: 16),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                PrimaryButton(
                  text: 'Gửi Link Đặt Lại Mật Khẩu',
                  icon: Icons.send_rounded,
                  isLoading: _isSendingEmail,
                  onPressed: _handleSendResetLink,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Security Tips Card
          GlassCard(
            padding: const EdgeInsets.all(16),
            borderRadius: 16,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.shield_outlined,
                    color: AppColors.primaryLight, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Cơ chế bảo mật link dùng 1 lần',
                        style: AppTextStyles.labelBold.copyWith(fontSize: 13),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Link và Token đặt lại mật khẩu có thời hạn sử dụng và sẽ bị hủy ngay sau khi bạn đổi mật khẩu thành công.',
                        style: AppTextStyles.bodySm
                            .copyWith(color: AppColors.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 2: ĐẶT LẠI MẬT KHẨU BẰNG TOKEN
  // ==========================================
  Widget _buildTabSetNewPassword() {
    final eval = PasswordPolicyUtils.evaluatePassword(_newPasswordController.text);
    final passwordsMatch = _newPasswordController.text.isNotEmpty &&
        _newPasswordController.text == _confirmPasswordController.text;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Step 2A: Token Input & Verification
          GlassCard(
            padding: const EdgeInsets.all(20),
            borderRadius: 20,
            border: Border.all(
              color: _verifiedLinkInfo != null
                  ? AppColors.success.withValues(alpha: 0.5)
                  : AppColors.borderGlass,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Mã Token hoặc Link từ Email',
                      style: AppTextStyles.labelBold.copyWith(fontSize: 12),
                    ),
                    TextButton.icon(
                      onPressed: _pasteFromClipboard,
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      icon: const Icon(Icons.content_paste_rounded,
                          size: 14, color: AppColors.primaryLight),
                      label: Text(
                        'Dán mã / link',
                        style: AppTextStyles.labelSm
                            .copyWith(color: AppColors.primaryLight),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                TextField(
                  controller: _tokenController,
                  style: AppTextStyles.bodySm.copyWith(
                    color: Colors.white,
                    fontFamily: 'monospace',
                  ),
                  decoration: InputDecoration(
                    hintText: 'Dán link hoặc mã token nhận được từ email...',
                    hintStyle: AppTextStyles.bodySm
                        .copyWith(color: AppColors.textMuted, fontSize: 11),
                    prefixIcon: const Icon(Icons.key_rounded,
                        color: AppColors.primaryLight, size: 20),
                    suffixIcon: _isCheckingToken
                        ? const Padding(
                            padding: EdgeInsets.all(12),
                            child: SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                    AppColors.primaryLight),
                              ),
                            ),
                          )
                        : IconButton(
                            icon: const Icon(Icons.arrow_circle_right_rounded,
                                color: AppColors.primaryLight, size: 24),
                            onPressed: _validateToken,
                            tooltip: 'Kiểm tra mã',
                          ),
                  ),
                  onSubmitted: (_) => _validateToken(),
                ),

                // Error checking token
                if (_tokenError != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: AppColors.danger.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded,
                            color: AppColors.danger, size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _tokenError!,
                            style: AppTextStyles.bodySm
                                .copyWith(color: AppColors.danger, fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Verified account info card
                if (_verifiedLinkInfo != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: AppColors.success.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.success,
                          ),
                          child: const Icon(Icons.verified_user_rounded,
                              size: 16, color: Colors.white),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _verifiedLinkInfo!.fullName,
                                style: AppTextStyles.labelBold.copyWith(
                                  color: Colors.white,
                                  fontSize: 13,
                                ),
                              ),
                              Text(
                                _verifiedLinkInfo!.email,
                                style: AppTextStyles.bodySm.copyWith(
                                  color: AppColors.textMuted,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        StatusBadge(
                          label: _verifiedLinkInfo!.activation
                              ? 'KÍCH HOẠT'
                              : 'HỢP LỆ',
                          type: BadgeType.success,
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Step 2B: New Password Form
          GlassCard(
            padding: const EdgeInsets.all(20),
            borderRadius: 20,
            border: Border.all(color: AppColors.borderGlass),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mật khẩu mới',
                  style: AppTextStyles.labelBold.copyWith(fontSize: 12),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _newPasswordController,
                  obscureText: _obscureNewPass,
                  style: AppTextStyles.bodyMd.copyWith(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Nhập ít nhất 8 ký tự...',
                    prefixIcon: const Icon(Icons.lock_outline_rounded,
                        color: AppColors.primaryLight, size: 20),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureNewPass
                            ? Icons.visibility_off_rounded
                            : Icons.visibility_rounded,
                        color: AppColors.textMuted,
                        size: 20,
                      ),
                      onPressed: () =>
                          setState(() => _obscureNewPass = !_obscureNewPass),
                    ),
                  ),
                ),

                // Password strength meter
                if (_newPasswordController.text.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: eval.strengthScore,
                            minHeight: 4,
                            backgroundColor: AppColors.surfaceCardHigh,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              eval.strengthScore >= 0.8
                                  ? AppColors.success
                                  : eval.strengthScore >= 0.6
                                      ? AppColors.primaryLight
                                      : eval.strengthScore >= 0.4
                                          ? AppColors.warning
                                          : AppColors.danger,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Độ mạnh: ${eval.strengthLabel}',
                        style: AppTextStyles.labelSm.copyWith(
                          fontSize: 11,
                          color: eval.strengthScore >= 0.6
                              ? AppColors.success
                              : AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 16),

                Text(
                  'Nhập lại mật khẩu mới',
                  style: AppTextStyles.labelBold.copyWith(fontSize: 12),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _confirmPasswordController,
                  obscureText: _obscureConfirmPass,
                  style: AppTextStyles.bodyMd.copyWith(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Xác nhận lại mật khẩu...',
                    prefixIcon: const Icon(Icons.lock_clock_outlined,
                        color: AppColors.primaryLight, size: 20),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureConfirmPass
                            ? Icons.visibility_off_rounded
                            : Icons.visibility_rounded,
                        color: AppColors.textMuted,
                        size: 20,
                      ),
                      onPressed: () => setState(
                          () => _obscureConfirmPass = !_obscureConfirmPass),
                    ),
                  ),
                ),

                if (_confirmPasswordController.text.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(
                        passwordsMatch
                            ? Icons.check_circle_outline_rounded
                            : Icons.highlight_off_rounded,
                        size: 14,
                        color: passwordsMatch
                            ? AppColors.success
                            : AppColors.danger,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        passwordsMatch
                            ? 'Mật khẩu trùng khớp'
                            : 'Mật khẩu nhập lại chưa khớp',
                        style: AppTextStyles.bodySm.copyWith(
                          fontSize: 11,
                          color: passwordsMatch
                            ? AppColors.success
                            : AppColors.danger,
                        ),
                      ),
                    ],
                  ),
                ],

                // Error message
                if (_setPasswordError != null) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: AppColors.danger.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline_rounded,
                            color: AppColors.danger, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _setPasswordError!,
                            style: AppTextStyles.bodySm.copyWith(
                                color: AppColors.danger, fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 20),

                PrimaryButton(
                  text: 'Lưu & Cập Nhật Mật Khẩu',
                  icon: Icons.check_rounded,
                  isLoading: _isSubmittingNewPass,
                  onPressed: _handleSetPassword,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  // ==========================================
  // VIEW: KHI CẬP NHẬT MẬT KHẨU THÀNH CÔNG
  // ==========================================
  Widget _buildSuccessView() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: GlassCard(
          padding: const EdgeInsets.all(28),
          borderRadius: 24,
          border: Border.all(color: AppColors.success.withValues(alpha: 0.4)),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.success.withValues(alpha: 0.15),
                  border: Border.all(color: AppColors.success, width: 2),
                ),
                child: const Icon(
                  Icons.check_rounded,
                  size: 44,
                  color: AppColors.success,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Đặt Mật Khẩu Thành Công!',
                textAlign: TextAlign.center,
                style: AppTextStyles.headlineMd.copyWith(
                  color: Colors.white,
                  fontSize: 20,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Mật khẩu mới của bạn đã được cập nhật an toàn vào hệ thống máy chủ AIVES. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới này.',
                textAlign: TextAlign.center,
                style: AppTextStyles.bodySm.copyWith(
                  color: AppColors.textSecondary,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              PrimaryButton(
                text: widget.isFromProfile ? 'Hoàn tất' : 'Đăng Nhập Ngay',
                icon: Icons.arrow_forward_rounded,
                onPressed: () {
                  Navigator.of(context).pop(true);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
